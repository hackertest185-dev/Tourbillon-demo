namespace backend.Middleware;

/// Requires an authenticator claim for Admin write operations when enabled.
/// Reads remain available so an administrator can open the MFA setup screen.
public sealed class AdminMfaMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IConfiguration _configuration;

    public AdminMfaMiddleware(RequestDelegate next, IConfiguration configuration)
    {
        _next = next;
        _configuration = configuration;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var requireMfa = _configuration.GetValue<bool>("AdminSecurity:RequireMfaForWrites");
        var path = context.Request.Path;
        var isAdminApi = path.StartsWithSegments("/api/admin")
            || (path.StartsWithSegments("/api/watch") && !path.StartsWithSegments("/api/watch/find"))
            || path.StartsWithSegments("/api/brand")
            || path.StartsWithSegments("/api/collection");
        var isWrite = HttpMethods.IsPost(context.Request.Method) ||
                      HttpMethods.IsPut(context.Request.Method) ||
                      HttpMethods.IsPatch(context.Request.Method) ||
                      HttpMethods.IsDelete(context.Request.Method);

        if (requireMfa && isAdminApi && isWrite &&
            context.User.Identity?.IsAuthenticated == true &&
            context.User.IsInRole("Admin") &&
            !context.User.HasClaim("mfa", "true"))
        {
            context.Response.StatusCode = StatusCodes.Status428PreconditionRequired;
            await context.Response.WriteAsJsonAsync(new
            {
                message = "Authenticator verification is required.",
                mfaRequired = true
            });
            return;
        }

        await _next(context);
    }
}
