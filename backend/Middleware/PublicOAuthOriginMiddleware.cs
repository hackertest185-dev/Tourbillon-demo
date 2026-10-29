namespace backend.Middleware;

/// Uses the configured public origin for both halves of the Google OAuth flow.
/// The reverse proxy's internal host must never become the token exchange redirect URI.
public sealed class PublicOAuthOriginMiddleware
{
    private readonly RequestDelegate _next;
    private readonly Uri? _publicOrigin;

    public PublicOAuthOriginMiddleware(RequestDelegate next, IConfiguration configuration)
    {
        _next = next;
        if (Uri.TryCreate(configuration["AppSettings:FrontendBaseUrl"], UriKind.Absolute, out var origin)
            && (origin.Scheme == Uri.UriSchemeHttps
                || (origin.Scheme == Uri.UriSchemeHttp && origin.IsLoopback)))
            _publicOrigin = origin;
    }

    public Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path;
        if (_publicOrigin is not null
            && (path.Equals("/api/authentication/google", StringComparison.OrdinalIgnoreCase)
                || path.Equals("/signin-google", StringComparison.OrdinalIgnoreCase)
                || path.Equals("/api/authentication/google-callback", StringComparison.OrdinalIgnoreCase)))
        {
            // Trust configuration, not a client-supplied Host or forwarding header.
            context.Request.Scheme = _publicOrigin.Scheme;
            context.Request.Host = new HostString(_publicOrigin.Authority);
        }

        return _next(context);
    }
}
