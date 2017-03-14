# Contributing Guidelines

Contributions welcome!

**Before spending lots of time on something, ask for feedback on your idea first!**

Please search issues and pull requests before adding something new to avoid duplicating
efforts and conversations.

This project welcomes non-code contributions, too! The following types of contributions
are welcome:

- **Ideas**: participate in an issue thread or start your own to have your voice heard.
- **Writing**: contribute your expertise in an area by helping expand the included docs.
- **Copy editing**: fix typos, clarify language, and improve the quality of the docs.
- **Formatting**: help keep docs easy to read with consistent formatting.

## Code Style

[![standard][standard-image]][standard-url]

This repository uses [`standard`][standard-url] to maintain code style and consistency,
and to avoid style arguments. `npm test` runs `standard` automatically, so you don't have
to!

[standard-image]: https://cdn.rawgit.com/feross/standard/master/badge.svg
[standard-url]: https://github.com/feross/standard

## Project Governance

Individuals making significant and valuable contributions are given commit-access to the
project to contribute as they see fit. This project is more like an open wiki than a
standard guarded open source project.

### Rules

There are a few basic ground-rules for contributors:

1. **No `--force` pushes to master** or modifying history in any way. Rebasing and force pushing your own PR branch is fine.
2. **Non-master branches** should be used for ongoing work.
3. **Significant modifications** like API changes should be subject to a **pull request**
   to solicit feedback from other contributors.
4. **Pull requests** are *encouraged* for all contributions to solicit feedback, but left to
   the discretion of the contributor.

### Releases

Declaring formal releases remains the prerogative of the project maintainer.

### Changes to this arrangement

This is an experiment and feedback is welcome! This document may also be subject to pull-
requests or changes by contributors where you believe you have something valuable to add
or change.

## Developer's Certificate of Origin 1.1

By making a contribution to this project, I certify that:

- (a) The contribution was created in whole or in part by me and I have the right to
  submit it under the open source license indicated in the file; or

- (b) The contribution is based upon previous work that, to the best of my knowledge, is
  covered under an appropriate open source license and I have the right under that license
  to submit that work with modifications, whether created in whole or in part by me, under
  the same open source license (unless I am permitted to submit under a different
  license), as indicated in the file; or

- (c) The contribution was provided directly to me by some other person who certified
  (a), (b) or (c) and I have not modified it.

- (d) I understand and agree that this project and the contribution are public and that a
  record of the contribution (including all personal information I submit with it,
  including my sign-off) is maintained indefinitely and may be redistributed consistent
  with this project or the open source license(s) involved.

## Release Procedure

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

  Create a pull request in [webtorrent.io](https://github.com/feross/webtorrent.io). Update
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
