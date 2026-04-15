public sealed class WindowTracker
{
    private readonly BrowserInspector _browserInspector;
    private ForegroundState? _current;
    private DateTimeOffset _startedAtUtc;

    public WindowTracker(BrowserInspector browserInspector)
    {
        _browserInspector = browserInspector;
        _startedAtUtc = DateTimeOffset.UtcNow;
    }

    public ActivitySample? Poll(string sessionId, string userId, string deviceName, int foregroundSliceSeconds)
    {
        DateTimeOffset now = DateTimeOffset.UtcNow;
        ForegroundState? latest = NativeMethods.ReadForegroundWindow(_browserInspector);

        if (latest is null)
        {
            return null;
        }

        if (_current is null)
        {
            _current = latest;
            _startedAtUtc = now;
            return null;
        }

        bool changed = latest.Hwnd != _current.Hwnd
            || !string.Equals(latest.WindowTitle, _current.WindowTitle, StringComparison.Ordinal);

        if (!changed)
        {
            int safeSliceSeconds = Math.Max(2, foregroundSliceSeconds);
            long elapsedMs = (long)(now - _startedAtUtc).TotalMilliseconds;
            long sliceMs = safeSliceSeconds * 1000L;

            if (elapsedMs >= sliceMs)
            {
                ActivitySample sliceSample = new(
                    Id: null,
                    SessionId: sessionId,
                    UserId: userId,
                    DeviceName: deviceName,
                    AppName: _current.AppName,
                    ProcessName: _current.ProcessName,
                    WindowTitle: _current.WindowTitle,
                    Url: _current.Url,
                    UrlDomain: _current.UrlDomain,
                    StartUtc: _startedAtUtc,
                    EndUtc: now,
                    DurationMs: elapsedMs,
                    Synced: false
                );

                _startedAtUtc = now;
                return sliceSample;
            }

            return null;
        }

        long durationMs = (long)(now - _startedAtUtc).TotalMilliseconds;
        if (durationMs < 250)
        {
            _current = latest;
            _startedAtUtc = now;
            return null;
        }

        ActivitySample sample = new(
            Id: null,
            SessionId: sessionId,
            UserId: userId,
            DeviceName: deviceName,
            AppName: _current.AppName,
            ProcessName: _current.ProcessName,
            WindowTitle: _current.WindowTitle,
            Url: _current.Url,
            UrlDomain: _current.UrlDomain,
            StartUtc: _startedAtUtc,
            EndUtc: now,
            DurationMs: durationMs,
            Synced: false
        );

        _current = latest;
        _startedAtUtc = now;
        return sample;
    }

    public ActivitySample? Flush(string sessionId, string userId, string deviceName)
    {
        if (_current is null)
        {
            return null;
        }

        DateTimeOffset now = DateTimeOffset.UtcNow;
        long durationMs = (long)(now - _startedAtUtc).TotalMilliseconds;
        if (durationMs <= 0)
        {
            return null;
        }

        ActivitySample sample = new(
            Id: null,
            SessionId: sessionId,
            UserId: userId,
            DeviceName: deviceName,
            AppName: _current.AppName,
            ProcessName: _current.ProcessName,
            WindowTitle: _current.WindowTitle,
            Url: _current.Url,
            UrlDomain: _current.UrlDomain,
            StartUtc: _startedAtUtc,
            EndUtc: now,
            DurationMs: durationMs,
            Synced: false
        );

        _current = null;
        _startedAtUtc = now;
        return sample;
    }
}
