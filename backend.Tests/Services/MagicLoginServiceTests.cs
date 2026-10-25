// Unit tests for MagicLoginService.
// Covers Redis-backed code storage plus the new-account metadata returned by VerifyAsync.
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Configuration;
using Moq;

namespace backend.Tests.Services;

public class MagicLoginServiceTests
{
    private static Mock<UserManager<User>> MockUserManager()
    {
        var store = new Mock<IUserStore<User>>();
        return new Mock<UserManager<User>>(store.Object, null!, null!, null!, null!, null!, null!, null!, null!);
    }

    private static Mock<IEmailService> SilentEmailService()
    {
        var mock = new Mock<IEmailService>();
        mock.Setup(e => e.SendEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(true);
        return mock;
    }

    private static Mock<IRoleManagementService> MockRoleManagement() => new();

    private static OtpSecurityService Otp() => new(
        new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["AuthSecurity:OtpPepper"] = "test-pepper"
        }).Build(),
        NullLogger<OtpSecurityService>.Instance);

    private class FakeRedis : IRedisService
    {
        private readonly Dictionary<string, string> _store = new();

        public Task<long> IncrementAsync(string key, TimeSpan? ttlOnCreate = null)
        {
            _store.TryGetValue(key, out var v);
            var next = (long.TryParse(v, out var n) ? n : 0) + 1;
            _store[key] = next.ToString();
            return Task.FromResult(next);
        }

        public Task<long?> GetCounterAsync(string key)
        {
            if (_store.TryGetValue(key, out var v) && long.TryParse(v, out var n))
                return Task.FromResult<long?>(n);
            return Task.FromResult<long?>(null);
        }

        public Task<string?> GetStringAsync(string key)
        {
            _store.TryGetValue(key, out var val);
            return Task.FromResult(val);
        }

        public Task SetStringAsync(string key, string value, TimeSpan? expiry = null)
        {
            _store[key] = value;
            return Task.CompletedTask;
        }

        public Task<bool> RemoveAsync(string key) => Task.FromResult(_store.Remove(key));

        public Task<bool> CompareAndRemoveAsync(string key, string expectedValue)
        {
            if (_store.TryGetValue(key, out var value) && value == expectedValue)
                return Task.FromResult(_store.Remove(key));
            return Task.FromResult(false);
        }

        public Task SetHashFieldAsync(string key, string field, string value, TimeSpan? expiry = null)
        {
            _store[$"{key}:{field}"] = value;
            return Task.CompletedTask;
        }

        public Task<string?> GetHashFieldAsync(string key, string field)
        {
            _store.TryGetValue($"{key}:{field}", out var val);
            return Task.FromResult(val);
        }

        public Task<bool> RemoveHashAsync(string key) => Task.FromResult(_store.Remove(key));

        public Task RefreshExpiryAsync(string key, TimeSpan expiry) => Task.CompletedTask;
    }

    [Fact]
    public async Task RequestAsync_StoresCode_InRedis()
    {
        var userMgr = MockUserManager();
        userMgr.Setup(u => u.FindByEmailAsync("test@example.com")).ReturnsAsync((User?)null);

        var redis = new FakeRedis();
        var service = new MagicLoginService(
            userMgr.Object,
            SilentEmailService().Object,
            redis,
            Otp(),
            MockRoleManagement().Object,
            NullLogger<MagicLoginService>.Instance);

        await service.RequestAsync("test@example.com");

        var code = await redis.GetStringAsync("magic:TEST@EXAMPLE.COM");
        Assert.NotNull(code);
        Assert.Equal(64, code!.Length);
    }

    [Fact]
    public async Task VerifyAsync_ReturnsNull_WhenCodeMissing()
    {
        var service = new MagicLoginService(
            MockUserManager().Object,
            SilentEmailService().Object,
            new FakeRedis(),
            Otp(),
            MockRoleManagement().Object,
            NullLogger<MagicLoginService>.Instance);

        var (user, isNewAccount) = await service.VerifyAsync("test@example.com", "ABCDEF");

        Assert.Null(user);
        Assert.False(isNewAccount);
    }

    [Fact]
    public async Task VerifyAsync_ReturnsNull_WhenCodeMismatch()
    {
        var redis = new FakeRedis();
        await redis.SetStringAsync("magic:TEST@EXAMPLE.COM", Otp().Hash("magic-login", "TEST@EXAMPLE.COM", "ZZZZZZ"));

        var service = new MagicLoginService(
            MockUserManager().Object,
            SilentEmailService().Object,
            redis,
            Otp(),
            MockRoleManagement().Object,
            NullLogger<MagicLoginService>.Instance);

        var (user, isNewAccount) = await service.VerifyAsync("test@example.com", "ABCDEF");

        Assert.Null(user);
        Assert.False(isNewAccount);
    }

    [Fact]
    public async Task VerifyAsync_ReturnsExistingUser_WhenCodeMatches()
    {
        var existingUser = new User { Id = 42, Email = "test@example.com" };
        var userMgr = MockUserManager();
        userMgr.Setup(u => u.FindByEmailAsync("test@example.com")).ReturnsAsync(existingUser);

        var redis = new FakeRedis();
        await redis.SetStringAsync("magic:TEST@EXAMPLE.COM", Otp().Hash("magic-login", "TEST@EXAMPLE.COM", "ABC123"));

        var service = new MagicLoginService(
            userMgr.Object,
            SilentEmailService().Object,
            redis,
            Otp(),
            MockRoleManagement().Object,
            NullLogger<MagicLoginService>.Instance);

        var (user, isNewAccount) = await service.VerifyAsync("test@example.com", "abc123");

        Assert.NotNull(user);
        Assert.Equal(42, user!.Id);
        Assert.False(isNewAccount);
    }

    [Fact]
    public async Task VerifyAsync_AutoCreatesUser_AndMarksNewAccount()
    {
        var createdUser = new User { Id = 99, Email = "new@example.com" };
        var userMgr = MockUserManager();
        userMgr.SetupSequence(u => u.FindByEmailAsync("new@example.com"))
            .ReturnsAsync((User?)null)
            .ReturnsAsync(createdUser);
        userMgr.Setup(u => u.CreateAsync(It.IsAny<User>()))
            .Callback<User>(user => user.Id = createdUser.Id)
            .ReturnsAsync(IdentityResult.Success);

        var redis = new FakeRedis();
        await redis.SetStringAsync("magic:NEW@EXAMPLE.COM", Otp().Hash("magic-login", "NEW@EXAMPLE.COM", "NEW123"));

        var service = new MagicLoginService(
            userMgr.Object,
            SilentEmailService().Object,
            redis,
            Otp(),
            MockRoleManagement().Object,
            NullLogger<MagicLoginService>.Instance);

        var (user, isNewAccount) = await service.VerifyAsync("new@example.com", "NEW123");

        Assert.NotNull(user);
        Assert.True(isNewAccount);
    }

    [Fact]
    public async Task VerifyAsync_ConsumesCode_SoSecondVerifyFails()
    {
        var existingUser = new User { Id = 1, Email = "test@example.com" };
        var userMgr = MockUserManager();
        userMgr.Setup(u => u.FindByEmailAsync("test@example.com")).ReturnsAsync(existingUser);

        var redis = new FakeRedis();
        await redis.SetStringAsync("magic:TEST@EXAMPLE.COM", Otp().Hash("magic-login", "TEST@EXAMPLE.COM", "XYZ999"));

        var service = new MagicLoginService(
            userMgr.Object,
            SilentEmailService().Object,
            redis,
            Otp(),
            MockRoleManagement().Object,
            NullLogger<MagicLoginService>.Instance);

        var (firstUser, firstIsNewAccount) = await service.VerifyAsync("test@example.com", "XYZ999");
        var (secondUser, secondIsNewAccount) = await service.VerifyAsync("test@example.com", "XYZ999");

        Assert.NotNull(firstUser);
        Assert.False(firstIsNewAccount);
        Assert.Null(secondUser);
        Assert.False(secondIsNewAccount);
    }
}
