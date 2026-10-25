namespace backend.Middleware;

/// Adds browser security headers and rejects cross-origin state-changing
/// requests that could otherwise abuse the Identity cookie (CSRF).
public sealed class BrowserSecurityMiddleware
{
    private readonly RequestDelegate _next;
    private readonly HashSet<string> _allowedOrigins;
    private readonly IWebHostEnvironment _environment;

    public BrowserSecurityMiddleware(
        RequestDelegate next,
        IConfiguration configuration,
        IWebHostEnvironment environment)
    {
        _next = next;
        _environment = environment;
        _allowedOrigins = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var origin in (configuration["ALLOWED_ORIGINS"] ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            _allowedOrigins.Add(origin.TrimEnd('/'));

        var frontend = configuration["AppSettings:FrontendBaseUrl"];
        if (!string.IsNullOrWhiteSpace(frontend))
            _allowedOrigins.Add(frontend.TrimEnd('/'));
    }

    public async Task InvokeAsync(HttpContext context)
    {
        ApplyHeaders(context.Response);

        if (IsUnsafeMethod(context.Request.Method) && !IsSafeOrigin(context.Request))
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            await context.Response.WriteAsJsonAsync(new { message = "Cross-origin request rejected." });
            return;
        }

        await _next(context);
    }

    private bool IsSafeOrigin(HttpRequest request)
    {
        var origin = request.Headers.Origin.FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(origin))
            return _allowedOrigins.Contains(origin.TrimEnd('/'));

        // Browsers that omit Origin on form-style requests still send Referer.
        // Requests from non-browser API clients may omit both headers and remain
        // usable; the cookie's SameSite policy remains the second barrier.
        var referer = request.Headers.Referer.FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(referer))
        {
            if (!Uri.TryCreate(referer, UriKind.Absolute, out var uri)) return false;
            return _allowedOrigins.Contains($"{uri.Scheme}://{uri.Authority}");
        }

        return true;
    }

    private void ApplyHeaders(HttpResponse response)
    {
        response.Headers["X-Content-Type-Options"] = "nosniff";
        response.Headers["X-Frame-Options"] = "DENY";
        response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
        response.Headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=()";
        response.Headers["Cross-Origin-Opener-Policy"] = "same-origin";
        response.Headers["Cross-Origin-Resource-Policy"] = "same-site";

        if (_environment.IsProduction())
        {
            response.Headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
            response.Headers["Content-Security-Policy-Report-Only"] =
                "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; " +
                "img-src 'self' data: blob: https://*.cloudfront.net; connect-src 'self' https:; " +
                "font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'";
        }
    }

    private static bool IsUnsafeMethod(string method) =>
        HttpMethods.IsPost(method) || HttpMethods.IsPut(method) ||
        HttpMethods.IsPatch(method) || HttpMethods.IsDelete(method);
}
