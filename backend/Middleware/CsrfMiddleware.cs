using Microsoft.AspNetCore.Antiforgery;

namespace backend.Middleware;

/// Validates CSRF tokens for state-changing requests made by an authenticated
/// browser session. Anonymous flows such as login, registration and password
/// reset remain usable by non-browser clients, while every cookie-authenticated
/// mutation requires both the cookie and the request header token.
public sealed class CsrfMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IAntiforgery _antiforgery;

    public CsrfMiddleware(RequestDelegate next, IAntiforgery antiforgery)
    {
        _next = next;
        _antiforgery = antiforgery;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var method = context.Request.Method;
        var isUnsafe = HttpMethods.IsPost(method) || HttpMethods.IsPut(method) ||
                       HttpMethods.IsPatch(method) || HttpMethods.IsDelete(method);
        var isCsrfEndpoint = context.Request.Path.Equals("/api/authentication/csrf", StringComparison.OrdinalIgnoreCase);

        if (!isUnsafe || isCsrfEndpoint || context.User.Identity?.IsAuthenticated != true)
        {
            await _next(context);
            return;
        }

        try
        {
            await _antiforgery.ValidateRequestAsync(context);
            await _next(context);
        }
        catch (AntiforgeryValidationException)
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            await context.Response.WriteAsJsonAsync(new { message = "A valid CSRF token is required." });
        }
    }
}
