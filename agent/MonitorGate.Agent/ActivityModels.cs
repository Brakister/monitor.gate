public sealed record ActivitySample(
    long? Id,
    string SessionId,
    string UserId,
    string DeviceName,
    string AppName,
    string ProcessName,
    string WindowTitle,
    string? Url,
    string? UrlDomain,
    DateTimeOffset StartUtc,
    DateTimeOffset EndUtc,
    long DurationMs,
    bool Synced
);

public sealed record ForegroundState(
    IntPtr Hwnd,
    string AppName,
    string ProcessName,
    string WindowTitle,
    string? Url,
    string? UrlDomain
);
