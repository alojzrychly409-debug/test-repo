# NEXUS Evolution proposal — latency-aware scheduler

Status: ready_review (not approved or deployed).

Experiment method: 80 synthetic allocations from captured resource usage
and observed EMA network latencies. No HTTP requests and no claimed live A/B result.
Baseline total projected latency (ms): 67555.55
Candidate total projected latency (ms): 9698.9
Estimated improvement: 85.64%
Quota safety preserved: True
Offline unit tests passed: True

Baseline allocation: {"deno": 35, "googleapps": 11, "netlify": 11, "supabase": 12, "valtown": 11}
Candidate allocation: {"deno": 48, "googleapps": 0, "netlify": 0, "supabase": 30, "valtown": 2}

The proposal changes ONLY the worker-selection score, not quotas, credentials,
worker enrollment, retry safety or payment policy.

Human review required before any PR merge, canary deployment or rollout.
A live experiment must use explicitly approved bounded allocations,
and rejection/rollback must remain available.

Artifacts: proposal.json and scheduler.patch.

## Patch for human review (not deployed)

```diff
--- a/resource_manager.py
+++ b/resource_manager.py
@@ -98,7 +98,7 @@
         if daily>=cap_day or monthly>=cap_month:
             continue
         # Balance available quota first, then favor faster workers.
-        score=(daily/max(1,cap_day), monthly/max(1,cap_month),float(ema)+min(failures,20)*100)
+        score=(0.60*(float(ema)+min(failures,20)*100)/1000+0.35*daily/max(1,cap_day)+0.05*monthly/max(1,cap_month), daily/max(1,cap_day), monthly/max(1,cap_month))
         selected.append((score,provider,url))
     return [(p,u) for _,p,u in sorted(selected,key=lambda r:r[0])]
 
```
