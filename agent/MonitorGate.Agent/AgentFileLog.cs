using System.Text;

public sealed class AgentFileLog
{
    private readonly object _gate = new();
    private readonly string _logPath;

    public AgentFileLog()
    {
        string appData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        string folder = Path.Combine(appData, "MonitorGate");
        Directory.CreateDirectory(folder);
        _logPath = Path.Combine(folder, "sync-log.txt");
    }

    public string LogPath => _logPath;

    public void Info(string message) => Write("INFO", message);

    public void Warn(string message) => Write("WARN", message);

    public void Error(string message) => Write("ERROR", message);

    private void Write(string level, string message)
    {
        string line = $"[{DateTimeOffset.UtcNow:O}] [{level}] {message}";

        lock (_gate)
        {
            File.AppendAllText(_logPath, line + Environment.NewLine, Encoding.UTF8);
        }
    }
}
