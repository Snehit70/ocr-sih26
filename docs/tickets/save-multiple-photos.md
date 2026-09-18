Part of #1. One inspection covers one physical package and may need photographs of several sides. The current upload accepts one image, while saved `blob:` URLs stop working after reload.

## Outcome

An operator can add, preview, remove, and reopen several photographs for one inspection without a server database.

## Acceptance

- Allow multiple package photographs in one inspection, with clear previews and removal before analysis.
- Save image bytes and inspection records in browser-only storage suited to images, such as IndexedDB. Reopening after reload shows the same photographs.
- Handle unavailable or full browser storage without claiming that evidence was saved.
- Keep photographs associated with one inspection ID and stable photo IDs for model observations and exports.
- Do not erase old user-created reports. If an old image reference cannot be restored, show that evidence is unavailable instead of inventing an image.
- Verify add, remove, reload, and storage-failure behavior.

No account sync or server database is in scope.
