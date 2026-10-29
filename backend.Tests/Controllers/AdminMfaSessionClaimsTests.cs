using System.Security.Claims;
using backend.Services;
using Microsoft.AspNetCore.Identity;

namespace backend.Tests.Controllers;

public class AdminMfaSessionClaimsTests
{
    [Theory]
    [InlineData("7", "7", true, true, true)]
    [InlineData("7", "7", false, true, false)]
    [InlineData("7", "8", true, true, false)]
    [InlineData("7", "7", true, false, false)]
    [InlineData("", "", true, true, false)]
    public async Task RefreshRetainsOnlyPreviouslyVerifiedProofForTheSameCurrentAdministrator(
        string oldId, string newId, bool verified, bool stillAdmin, bool expected)
    {
        var previous = new List<Claim> { new(ClaimTypes.NameIdentifier, oldId) };
        if (verified) previous.Add(new Claim("mfa", "true"));
        var next = new List<Claim> { new(ClaimTypes.NameIdentifier, newId) };
        if (stillAdmin) next.Add(new Claim(ClaimTypes.Role, "Admin"));
        var context = new SecurityStampRefreshingPrincipalContext
        {
            CurrentPrincipal = new ClaimsPrincipal(new ClaimsIdentity(previous, "cookie")),
            NewPrincipal = new ClaimsPrincipal(new ClaimsIdentity(next, "cookie"))
        };
        await AdminMfaSessionClaims.PreserveOnValidatedRefresh(context);
        Assert.Equal(expected, context.NewPrincipal.HasClaim("mfa", "true"));
    }
}
