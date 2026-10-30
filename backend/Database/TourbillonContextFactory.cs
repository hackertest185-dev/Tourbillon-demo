using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace backend.Database;

/// <summary>Allows EF migrations to be generated without starting Redis, Hangfire, or the web host.</summary>
public sealed class TourbillonContextFactory : IDesignTimeDbContextFactory<TourbillonContext>
{
    public TourbillonContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
            ?? "Host=localhost;Database=tourbillon_design;Username=postgres;Password=postgres";
        var options = new DbContextOptionsBuilder<TourbillonContext>()
            .UseNpgsql(connectionString, npgsql => npgsql.UseVector())
            .Options;
        return new TourbillonContext(options);
    }
}
