<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep settings and KPI management in their own TanStack file routes using the academy store, so existing navigation resolves without bypassing the local prototype provider.
- Apply prototype data additions through shared, marked one-time updates in seed creation and local-provider loading; preserve existing edits and do not resurrect later deletions.
