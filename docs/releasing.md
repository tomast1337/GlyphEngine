# Releasing

Releases are made by hand from a clean, pulled `main`. The npm account uses two-factor authentication, so each `npm publish` prints a login link: press Enter, confirm in the browser (authenticator code there).

1. Set the same version in all four `packages/*/package.json`, open a PR and merge it.
2. Build every asset into `release/`: the `glyph-engine` command per platform, `glyph-engine-web.js` and the npm tarballs (`workspace:*` is already replaced by the version in them).

    ```sh
    git switch main && git pull
    bun test && bun script/release.ts
    ```

3. Publish to npm, core first (the others depend on it). Each publish waits for that browser confirmation. A new package shows as `0.0.0-stage` for a few minutes while npm processes it. Run `npm login` first if `npm whoami` fails.

    ```sh
    v=$(bun -p "require('./packages/core/package.json').version")
    for p in core web tui desktop; do npm publish ./release/glyph-engine-$p-$v.tgz --access public; done
    ```

4. Tag and make the GitHub release with the assets:

    ```sh
    gh release create v$v release/* --title v$v --generate-notes
    ```

    `gh release create` makes the `v$v` tag on `main`. `--generate-notes` writes the notes from the merged PRs.
