using System.Data;
using Npgsql;

namespace Heliteb.Infrastructure.Data;

public interface INpgsqlConnectionFactory
{
    IDbConnection Create();
}

public class NpgsqlConnectionFactory : INpgsqlConnectionFactory
{
    private readonly string _connectionString;

    public NpgsqlConnectionFactory(string connectionString)
    {
        _connectionString = connectionString;
    }

    public IDbConnection Create() => new NpgsqlConnection(_connectionString);
}
