# Releasing

Releases are made by hand from a clean, pulled `main`. The npm account uses two-factor authentication, so `npm publish` asks for the authenticator code.

1. Set the same version in all four `packages/*/package.json`, open a PR and merge it.
2. Build every asset into `release/`: the `glyph-engine` command per platform, `glyph-engine-web.js` and the npm tarballs (`workspace:*` is already replaced by the version in them).

    ```sh
    git switch main && git pull
    bun test && bun script/release.ts
    ```

3. Publish to npm, core first (the others depend on it). Each publish asks for the authenticator code. Run `npm login` first if `npm whoami` fails.

    ```sh
    v=0.1.0
    for p in core web tui desktop; do npm publish release/glyph-engine-$p-$v.tgz --access public; done
    ```

4. Tag and make the GitHub release with the assets:

    ```sh
    gh release create v$v release/* --title v$v --generate-notes
    ```

    `gh release create` makes the `v$v` tag on `main`. `--generate-notes` writes the notes from the merged PRs.
