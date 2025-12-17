import { requestUrl, RequestUrlParam } from "obsidian";
import { HttpHandler, HttpRequest, HttpResponse } from "@smithy/protocol-http";
import { HttpHandlerOptions, HeaderBag } from "@smithy/types";

/**
 * 一个自定义的 HTTP Handler，使用 Obsidian 的 requestUrl (主进程) 来绕过 CORS 限制
 */
export class ObsidianHttpHandler implements HttpHandler {
    
    // 必须实现 handle 方法
    async handle(request: HttpRequest, options?: HttpHandlerOptions): Promise<{ response: HttpResponse }> {
        // 1. 构建 URL
        const queryString = this.buildQueryString(request.query || {});
        const port = request.port ? `:${request.port}` : "";
        const path = request.path.startsWith("/") ? request.path : `/${request.path}`;
        const url = `${request.protocol}//${request.hostname}${port}${path}${queryString ? `?${queryString}` : ""}`;

        // 2. 处理 Headers
        // 必须浅拷贝一份，避免修改原对象
        const headers: Record<string, string> = { ...request.headers };
        
        // Electron/Chromium 会自动管理 Host 和 Content-Length，手动设置常导致 ERR_INVALID_ARGUMENT
        delete headers['host']; 
        delete headers['content-length']; 

        // 3. 准备 requestUrl 参数
        const reqOptions: RequestUrlParam = {
            url: url,
            method: request.method,
            headers: headers,
            throw: false
        };

        // 之前的代码默认给 body 赋值 ""，这会导致 HEAD 请求报错
        if (request.method !== 'GET' && request.method !== 'HEAD') {
            reqOptions.body = this.parseBody(request.body);
        }

        // 调试日志：如果再次报错，打开控制台查看具体参数
        // console.log("ObsidianHttpHandler Request:", reqOptions);

        // 4. 发送请求
        const response = await requestUrl(reqOptions);

        // 5. 转换响应
        const responseHeaders: HeaderBag = {};
        for (const key in response.headers) {
            responseHeaders[key.toLowerCase()] = response.headers[key];
        }

        return {
            response: new HttpResponse({
                statusCode: response.status,
                headers: responseHeaders,
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