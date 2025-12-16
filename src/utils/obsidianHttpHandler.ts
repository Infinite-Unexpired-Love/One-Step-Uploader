import { requestUrl, RequestUrlParam } from "obsidian";
import { HttpHandler, HttpRequest, HttpResponse } from "@smithy/protocol-http";
import { HttpHandlerOptions, HeaderBag } from "@smithy/types";

/**
 * 一个自定义的 HTTP Handler，使用 Obsidian 的 requestUrl (主进程) 来绕过 CORS 限制
 */
export class ObsidianHttpHandler implements HttpHandler {
    
    // 必须实现 handle 方法
    async handle(request: HttpRequest, options?: HttpHandlerOptions): Promise<{ response: HttpResponse }> {
        // 1. 构建完整的 URL
        const queryString = this.buildQueryString(request.query || {});
        const port = request.port ? `:${request.port}` : "";
        const path = request.path.startsWith("/") ? request.path : `/${request.path}`;
        const url = `${request.protocol}//${request.hostname}${port}${path}${queryString ? `?${queryString}` : ""}`;

        // 2. 准备 requestUrl 参数
        const reqOptions: RequestUrlParam = {
            url: url,
            method: request.method,
            headers: request.headers,
            // requestUrl 支持 string | ArrayBuffer。
            // AWS SDK 的 body 可能是 Uint8Array, Buffer, string 或 stream。
            // 在你的场景中（上传 Buffer），它通常是 Uint8Array 或 Buffer。
            body: this.parseBody(request.body),
            throw: false // 不要让 Obsidian 自动抛出错误，我们需要拿到 status code 返回给 SDK 处理
        };

        // 3. 发送请求
        const response = await requestUrl(reqOptions);

        // 4. 将 Obsidian 的 response 转换为 AWS SDK 的 HttpResponse
        // 注意：SDK 期望 headers 是 HeaderBag (Record<string, string>)
        const headers: HeaderBag = {};
        for (const key in response.headers) {
            headers[key.toLowerCase()] = response.headers[key];
        }

        return {
            response: new HttpResponse({
                statusCode: response.status,
                headers: headers,
                // 将 ArrayBuffer 转回 Uint8Array，方便 SDK 解析
                body: new Uint8Array(response.arrayBuffer)
            })
        };
    }

    private parseBody(body: any): string | ArrayBuffer {
        if (typeof body === 'string') {
            return body;
        }
        if (body instanceof ArrayBuffer) {
            return body;
        }
        if (ArrayBuffer.isView(body)) {
            // 处理 Uint8Array / Buffer
            return body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as ArrayBuffer;
        }
        // 如果遇到流 (Stream)，requestUrl 不直接支持流式上传。
        // 但对于你的 put(buffer) 场景，以上逻辑已足够。
        return ""; 
    }

    /**
     * 处理 string, string[], null 等情况，并进行 URL 编码
     */
    private buildQueryString(query: Record<string, any>): string {
        const parts: string[] = [];
        
        for (const key of Object.keys(query)) {
            const value = query[key];
            
            // 忽略 null 或 undefined
            if (value === null || value === undefined) {
                continue;
            }

            // 处理数组情况 (例如 ?key=val1&key=val2)
            if (Array.isArray(value)) {
                for (const item of value) {
                    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(item)}`);
                }
            } else {
                // 处理普通字符串
                parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value as string)}`);
            }
        }

        return parts.join('&');
    }

    // 接口要求的其他方法实现（空实现即可）
    updateHttpClientConfig(key: any, value: any): void {}
    httpHandlerConfigs(): any { return {}; }
}