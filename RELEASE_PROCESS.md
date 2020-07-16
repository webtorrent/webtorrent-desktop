## Release Process

### 1. Create a new version

- Update `AUTHORS`

  ```
  npm run update-authors
  ```

  Commit if necessary. The commit message should be "authors".

- Write the changelog

  You can use `git log --oneline <last version tag>..HEAD` to get a list of changes.

  Summarize them concisely in `CHANGELOG.md`. The commit  message should be "changelog".

- Update the version

  ```
  npm version [major|minor|patch]
  ```

  This creates both a commit and a git tag.

- Make a PR

  Once the PR is reviewed, merge it:

  ```
  git push origin <branch-name>:master
  ```

  This makes it so that the commit hash on master matches the commit hash of the version tag.

  Finally, run:

  ```
  git push --tags
  ```

### 2. Create the release binaries

- On a Mac:

  ```
  npm run package -- darwin --sign
  ```

  Move the `.zip` and `.dmg` file somewhere because the next step wipes the `dist/` folder away.

  ```
  npm run package -- linux --sign
  ```

- On Windows, or in a Windows VM:

  ```
  npm run package -- win32 --sign
  ```

- Then, upload the release binaries to Github:

  ```
  npm run gh-release
  ```

  Follow the URL to a newly created Github release page. Manually upload the binaries from
  `webtorrent-desktop/dist/`. Open the previous release in another tab, and make sure that you
  are uploading the same set of files, no more, no less.

### 3. Test it

**This is the most important part.**

 - Manually download the binaries for each platform from Github.

  **Do not use your locally built binaries.** Modern OSs treat executables differently if they've
  been downloaded, even though the files are byte for byte identical. This ensures that the
  codesigning worked and is valid.

- Smoke test WebTorrent Desktop on each platform.

  See Smoke Tests below for details. Open DevTools
  on Windows and Mac, and ensure that the auto updater is running. If the auto updater does not
  run, users will successfully auto update to this new version, and then be stuck there forever.

### 4. Ship it

- Update the website

  Create a pull request in [webtorrent.io](https://github.com/webtorrent/webtorrent.io). Update
  `config.js`, updating the desktop app version.

  As soon as this PR is merged, Jenkins will automatically redeploy the WebTorrent website, and
  hundreds of thousands of users around the world will start auto updating. **Merge with care.**

## Smoke Tests

Before a release, check that the following basic use cases work correctly:

1. Click "Play" to stream a built-in torrent (e.g. Sintel)
  - Ensure that seeking to undownloaded region works and plays immediately.
  - Ensure that sintel.mp4 gets downloaded to `~/Downloads`.

2. Check that the auto-updater works
  - Open the console and check for the line "No update available" to indicate

3. Add a new .torrent file via drag-and-drop.
  - Ensure that it gets added to the list and starts downloading

4. Remove a torrent from the client
  - Ensure that the file is removed from `~/Downloads`

5. Create and seed a new a torrent via drag-and-drop.
  - Ensure that the torrent gets created and seeding begins.
