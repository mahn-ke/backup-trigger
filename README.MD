# Backup trigger

Triggers the `backup` workflow on all repositories in the `mahn-ke` organization every day at 00:00 UTC.  

As per [GitHub's official documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule):

> The schedule event can be delayed during periods of high loads of GitHub Actions workflow runs. High load times include the start of every hour. If the load is sufficiently high enough, some queued jobs may be dropped.

To work around the limitation, this script requests an external `workflow_dispatch` trigger, [unaffected by the limitation](https://github.com/orgs/upptime/discussions/112#discussioncomment-853841).