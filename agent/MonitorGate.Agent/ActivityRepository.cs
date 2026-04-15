using Microsoft.Data.Sqlite;

public sealed class ActivityRepository
{
    private readonly string _connectionString;

    public ActivityRepository()
    {
        string appData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        string folder = Path.Combine(appData, "MonitorGate");
        Directory.CreateDirectory(folder);
        string dbPath = Path.Combine(folder, "activity.db");
        _connectionString = new SqliteConnectionStringBuilder
        {
            DataSource = dbPath,
            Mode = SqliteOpenMode.ReadWriteCreate,
            Cache = SqliteCacheMode.Shared
        }.ToString();

        EnsureSchema();
    }

    private void EnsureSchema()
    {
        using SqliteConnection conn = new(_connectionString);
        conn.Open();

        using SqliteCommand cmd = conn.CreateCommand();
        cmd.CommandText = """
            CREATE TABLE IF NOT EXISTS activity (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                device_name TEXT NOT NULL,
                app_name TEXT NOT NULL,
                process_name TEXT NOT NULL,
                window_title TEXT NOT NULL,
                url TEXT NULL,
                url_domain TEXT NULL,
                start_utc TEXT NOT NULL,
                end_utc TEXT NOT NULL,
                duration_ms INTEGER NOT NULL,
                synced INTEGER NOT NULL DEFAULT 0
            );

            CREATE INDEX IF NOT EXISTS ix_activity_sync ON activity(synced, start_utc);
            CREATE INDEX IF NOT EXISTS ix_activity_user_day ON activity(user_id, start_utc);
            """;
        cmd.ExecuteNonQuery();
    }

    public void Insert(ActivitySample item)
    {
        using SqliteConnection conn = new(_connectionString);
        conn.Open();

        using SqliteCommand cmd = conn.CreateCommand();
        cmd.CommandText = """
            INSERT INTO activity
            (session_id, user_id, device_name, app_name, process_name, window_title, url, url_domain, start_utc, end_utc, duration_ms, synced)
            VALUES
            ($sessionId, $userId, $deviceName, $appName, $processName, $windowTitle, $url, $urlDomain, $startUtc, $endUtc, $durationMs, 0);
            """;

        cmd.Parameters.AddWithValue("$sessionId", item.SessionId);
        cmd.Parameters.AddWithValue("$userId", item.UserId);
        cmd.Parameters.AddWithValue("$deviceName", item.DeviceName);
        cmd.Parameters.AddWithValue("$appName", item.AppName);
        cmd.Parameters.AddWithValue("$processName", item.ProcessName);
        cmd.Parameters.AddWithValue("$windowTitle", item.WindowTitle);
        cmd.Parameters.AddWithValue("$url", (object?)item.Url ?? DBNull.Value);
        cmd.Parameters.AddWithValue("$urlDomain", (object?)item.UrlDomain ?? DBNull.Value);
        cmd.Parameters.AddWithValue("$startUtc", item.StartUtc.ToString("O"));
        cmd.Parameters.AddWithValue("$endUtc", item.EndUtc.ToString("O"));
        cmd.Parameters.AddWithValue("$durationMs", item.DurationMs);

        cmd.ExecuteNonQuery();
    }

    public IReadOnlyList<ActivitySample> GetPending(int take)
    {
        List<ActivitySample> list = [];
        using SqliteConnection conn = new(_connectionString);
        conn.Open();

        using SqliteCommand cmd = conn.CreateCommand();
        cmd.CommandText = """
            SELECT id, session_id, user_id, device_name, app_name, process_name, window_title, url, url_domain, start_utc, end_utc, duration_ms, synced
            FROM activity
            WHERE synced = 0
            ORDER BY id ASC
            LIMIT $take;
            """;
        cmd.Parameters.AddWithValue("$take", take);

        using SqliteDataReader reader = cmd.ExecuteReader();
        while (reader.Read())
        {
            list.Add(new ActivitySample(
                Id: reader.GetInt64(0),
                SessionId: reader.GetString(1),
                UserId: reader.GetString(2),
                DeviceName: reader.GetString(3),
                AppName: reader.GetString(4),
                ProcessName: reader.GetString(5),
                WindowTitle: reader.GetString(6),
                Url: reader.IsDBNull(7) ? null : reader.GetString(7),
                UrlDomain: reader.IsDBNull(8) ? null : reader.GetString(8),
                StartUtc: DateTimeOffset.Parse(reader.GetString(9)),
                EndUtc: DateTimeOffset.Parse(reader.GetString(10)),
                DurationMs: reader.GetInt64(11),
                Synced: reader.GetInt64(12) == 1
            ));
        }

        return list;
    }

    public void MarkSynced(IEnumerable<long> ids)
    {
        long[] idArr = ids.Where(id => id > 0).Distinct().ToArray();
        if (idArr.Length == 0)
        {
            return;
        }

        using SqliteConnection conn = new(_connectionString);
        conn.Open();
        using SqliteTransaction tx = conn.BeginTransaction();

        using SqliteCommand cmd = conn.CreateCommand();
        cmd.Transaction = tx;
        cmd.CommandText = "UPDATE activity SET synced = 1 WHERE id = $id;";
        SqliteParameter param = cmd.CreateParameter();
        param.ParameterName = "$id";
        cmd.Parameters.Add(param);

        foreach (long id in idArr)
        {
            param.Value = id;
            cmd.ExecuteNonQuery();
        }

        tx.Commit();
    }
}
