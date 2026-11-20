# Reproducing the experiments

The browser pages and command-line experiments use the same task engines. Browser evidence is stored with each task. The committed seeded baseline records a new, repeatable set of command-line games.

## Environment and commands

Install Node.js 20 or newer, clone the repository, and run these commands from its root. No dependency installation is required.

```sh
node --version
node scripts/verify.cjs
node scripts/reproduce.cjs
node scripts/reproduce.cjs --check
```

`verify.cjs` exits unsuccessfully on an assertion failure. It checks the Task 2 no-loss test, reachable two-player positions, all contiguous three-cell windows on sizes 3–10, and search-budget and undo behavior.

`reproduce.cjs` writes `.results/latest.json` and prints a summary. `--check` runs the same batches and requires exact equality with `experiments/baseline.json`. A deliberate change to search behavior can change that baseline. Review the changed move sequences and results before recording an updated baseline:

```sh
node scripts/reproduce.cjs --output experiments/baseline.json
```

## Repeatable configuration

The seed is **20261120**. Every randomized batch starts its own linear congruential generator. Its batch seed is the base seed plus the offset listed below. The generator uses unsigned 32-bit arithmetic with multiplier 1664525 and increment 1013904223, then divides by 2^32.

| Experiment | Games | Settings | Seed offset |
|---|---:|---|---:|
| Task 2 draw | 1 | Human opens, human squares 1, 2, 7, 6, 8 | Deterministic |
| Task 2 O win | 1 | Human opens, human squares 1, 2, 7, 9 | Deterministic |
| Task 3 full depth | 10 | Depth X 9, O 9, random ties on, random opening off, alternate starter | 30 |
| Task 3 limited depth | 5 | Depth X 9, O 1, random ties on, random opening off, alternate starter | 31 |
| Task 4 | 10 | 4×4, three players, depth 3, beam 0, ordering on, tactical and neighborhood shortcuts off, cap 300000 | 40 |
| Task 5 default | 10 per size | Each size B from 3 through 10, three players, depth 3, beam 8, all default heuristics on, cap 200000 | 50 + B |
| Task 5 full width | 1 | 4×4, depth toward terminal, beam 0, tactical and neighborhood shortcuts and ordering off, cap 500000 | 99 |

All multiplayer batches rotate the starter. The seeded generator continues through all games within one batch. Three consecutive matching marks win at every board size.

## Recorded results

The baseline stores settings and seeds, move sequences, search scores where available, node and cutoff counts, completed depth, budget-interruption events, final boards, outcomes, and scoreboards.

Elapsed times, dates, and browser heap readings vary between runs and machines. These fields are excluded from the deterministic baseline. The runner checks legal placement, turn order, first terminal outcome, node budgets, and scoreboard totals while it records each game.

The baseline includes a SHA-256 digest for every engine it executes, with line endings normalized to LF. The check command detects engine-file changes as well as result changes across operating systems.

Task 1 remains the supplied interactive sample and has browser evidence. To reproduce that example, play squares **1, 2, 7, 6, 9** in order, waiting for O's reply each turn. This sequence draws with the retained starter.

## Repeating the browser demonstrations

Open the task's `index.html` directly in a browser. Record browser version and operating system when collecting new evidence.

1. Task 2 offers a human-first and computer-first setting. The two human-first sequences in the table reproduce its draw and O-win examples. Pause after the first human corner opening to inspect the pruning comparison.
2. Task 3 uses `N = 10`, both depths 9, alternating starter, and random opening off for the full-depth trial. Use `N = 5` and O depth 1 for the second trial.
3. Task 4 uses `N = 10` and its default three-player settings. Its existing five-game screenshot is separate from the retained ten-game browser log.
4. Task 5 uses the default preset and `N = 10` on each size. Use the full-width preset on 4×4 with `N = 1` for the capped comparison.
5. Use **Download log** after each session and capture the final board and scoreboard. Use instant speed to reduce animation delay.

The pages use the browser's random generator. Their randomized outcomes can differ from each other and from the command-line seed. Use the command-line runner for exact seeded replay.

## Reading the metrics

A search node is a recursive engine visit. A cutoff event skips remaining siblings, potentially removing many future visits. Task 2 compares alpha-beta with a separately executed unpruned Minimax on the same position.

Task 4 and Task 5 use Maxⁿ. Each player maximizes its own component of the returned score vector. A draw gives every player one draw. A decisive three-player game contributes one win and two losses.

A node-budget event means a deeper iteration was interrupted and the engine continued with a previous completed result. Inspect the per-move records because a game's final move can finish below the cap even when earlier moves reached it.

Heuristic searches on larger boards can overlook winning plans beyond their depth or candidate limits. The recorded runs completed without memory exhaustion. Browser heap readings include allocations beyond the search, and a node budget bounds visited nodes while each node still requires computation.
