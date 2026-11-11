# Router validation set

`test.jsonl` is **auxiliary** synthetic data generated for evaluating the
prompt-level router only:

```bash
python generate_dataset.py --out router_data --train 1 --dev 1 --test 300 --seed 777
```

It uses the full vocabulary (including the held-out colours and nouns) so that
Rules and BERT disagree, unlike the provided `train`/`dev` splits. The official
`data/` files are never modified, and the official `test`/`handwritten_test`
splits are used only for final reporting.

Run:

```bash
python evaluate_router.py
```

This writes `results/router_metrics.json`.
