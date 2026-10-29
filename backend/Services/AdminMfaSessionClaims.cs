using System.Security.Claims;
using Microsoft.AspNetCore.Identity;

namespace backend.Services;

public static class AdminMfaSessionClaims
{
    public static Task PreserveOnValidatedRefresh(SecurityStampRefreshingPrincipalContext context)
    {
        // Identity invokes this only after the current user's security stamp
        // validates. A password reset or role-change stamp still revokes the cookie.
        var current = context.CurrentPrincipal;
        var refreshed = context.NewPrincipal;
        var currentId = current?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!string.IsNullOrEmpty(currentId)
            && currentId == refreshed?.FindFirstValue(ClaimTypes.NameIdentifier)
            && current!.HasClaim("mfa", "true")
            && refreshed!.IsInRole("Admin")
            && !refreshed.HasClaim("mfa", "true")
            && refreshed.Identity is ClaimsIdentity identity)
            identity.AddClaim(new Claim("mfa", "true"));

        return Task.CompletedTask;
    }
}
