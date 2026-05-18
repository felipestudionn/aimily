# Zara color taxonomy validation report

**Generated**: 2026-05-18T07:53:44.598Z
**Source**: undefined (source_id 21a17ec5-348a-46aa-bf10-7414638e5917)
**Model**: claude-sonnet-4-5
**SKU observations**: 113
**Unique color codes**: 43
**Divergences vs seed taxonomy**: 41

## Consensus stats
- Unanimous (all observations agree): 9
- Majority (≥60% agree): 3
- Split (<60% agree, disagreement): 5
- Single (only one observation): 26

## Pattern analysis — codes grouped by hundreds
| Range | # codes | Dominant family | Coverage | Sample |
|-------|---------|-----------------|----------|--------|
| 000-099 | 6 | azul | 50% | 043=azul marino, 044=azul, 060=azul, 070=crudo, 091=blanco |
| 100-199 | 1 | azul | 100% | 104=denim medio |
| 200-299 | 3 | blanco/crudo | 100% | 250=crudo, 251=crudo, 252=crudo |
| 300-399 | 3 | verde | 100% | 300=verde, 305=verde, 330=verde |
| 400-499 | 9 | azul | 89% | 400=denim medio, 401=azul noche, 402=blanco, 406=denim medio, 407=azul noche |
| 500-599 | 2 | verde | 50% | 506=caqui, 512=rosa palo |
| 600-699 | 6 | rojo/rosa | 67% | 600=verde, 612=rosa palo, 615=rosa, 620=rosa palo, 623=azul |
| 700-799 | 7 | verde | 43% | 700=marrón, 710=verde menta, 712=verde, 715=azul marino, 716=negro |
| 800-899 | 3 | negro/gris | 67% | 800=negro, 802=negro, 819=rosa |
| 900-999 | 3 | negro/gris | 67% | 919=rosa palo, 932=gris, 942=negro |

## Divergences vs seed taxonomy (41 of 43)

Codes where the Claude Vision observation disagrees with the seed mapping in `supabase/migrations/059d_strategy_storage_and_seed.sql`. The seed was an unvalidated starter; these are the entries that need correction.

| Code | Seed says | Observed | Observations | Consensus | Avg confidence |
|------|-----------|----------|--------------|-----------|----------------|
| 043 | (missing) | **azul marino** | 1 | single | 89% |
| 044 | (missing) | **azul** | 3 | unanimous | 88% |
| 060 | (missing) | **azul** | 1 | single | 89% |
| 070 | (missing) | **crudo** | 1 | single | 91% |
| 091 | (missing) | **blanco** | 1 | single | 92% |
| 094 | (missing) | **rojo** | 1 | single | 87% |
| 104 | (missing) | **denim medio** | 2 | unanimous | 91% |
| 250 | negro | **crudo** | 15 | majority | 92% |
| 251 | (missing) | **crudo** | 8 | unanimous | 92% |
| 252 | (missing) | **crudo** | 1 | single | 92% |
| 300 | amarillo_claro | **verde** | 2 | unanimous | 87% |
| 305 | tabaco | **verde** | 1 | single | 87% |
| 330 | (missing) | **verde** | 2 | unanimous | 86% |
| 400 | azul_medio | **denim medio** | 5 | majority | 90% |
| 401 | blanco | **azul noche** | 1 | single | 93% |
| 402 | (missing) | **blanco** | 1 | single | 92% |
| 407 | azul_oscuro | **azul noche** | 4 | unanimous | 89% |
| 427 | azul_claro | **denim medio** | 4 | unanimous | 90% |
| 428 | (missing) | **denim medio** | 1 | single | 90% |
| 441 | (missing) | **azul** | 1 | single | 90% |
| 485 | (missing) | **azul** | 1 | single | 88% |
| 506 | (missing) | **caqui** | 1 | single | 87% |
| 512 | (missing) | **rosa palo** | 1 | single | 88% |
| 600 | rojo | **verde** | 2 | split | 87% |
| 612 | (missing) | **rosa palo** | 1 | single | 88% |
| 615 | (missing) | **rosa** | 1 | single | 87% |
| 620 | cuero | **rosa palo** | 3 | unanimous | 88% |
| 623 | (missing) | **azul** | 1 | single | 88% |
| 632 | (missing) | **rojo** | 1 | single | 89% |
| 700 | marron | **marrón** | 2 | split | 92% |
| 710 | beige | **verde menta** | 2 | split | 87% |
| 712 | marron_claro | **verde** | 11 | split | 89% |
| 715 | (missing) | **azul marino** | 1 | single | 90% |
| 716 | marron_oscuro | **negro** | 1 | single | 94% |
| 725 | (missing) | **verde** | 1 | single | 86% |
| 741 | crema | **rosa palo** | 2 | unanimous | 88% |
| 800 | negro_carbon | **negro** | 18 | majority | 94% |
| 802 | gris_oscuro | **negro** | 2 | split | 90% |
| 819 | (missing) | **rosa** | 1 | single | 87% |
| 919 | (missing) | **rosa palo** | 1 | single | 90% |
| 942 | gris_claro | **negro** | 1 | single | 94% |

## Full proposed taxonomy (43 codes)

Sorted by code. Use the JSON file for programmatic merging.

| Code | Proposed name | Hex | Observations | Consensus | Sample model_refs |
|------|---------------|-----|--------------|-----------|-------------------|
| 043 | azul marino | `#2d3e52` | 1 | single | 2133 907 43 |
| 044 | azul | `#5a7fa3` | 3 | unanimous | 1097 966 44, 6095 783 44 |
| 060 | azul | `#6a8bb5` | 1 | single | 9479 10 60 |
| 070 | crudo | `#ebe5d6` | 1 | single | 2338 110 70 |
| 091 | blanco | `#f5f2ed` | 1 | single | 9479 8 91 |
| 094 | rojo | `#a84848` | 1 | single | 1953 967 94 |
| 104 | denim medio | `#5a6f85` | 2 | unanimous | 5216 78 104, 1551 355 104 |
| 250 | crudo | `#ede7d8` | 15 | majority | 6095 982 250, 4786 166 250 |
| 251 | crudo | `#ebe3d2` | 8 | unanimous | 5474 58 251, 5107 85 251 |
| 252 | crudo | `#ede6d7` | 1 | single | 5474 66 252 |
| 300 | verde | `#89a58a` | 2 | unanimous | 4786 151 300, 340 4 300 |
| 305 | verde | `#88a389` | 1 | single | 4786 166 305 |
| 330 | verde | `#88a482` | 2 | unanimous | 2581 80 330, 4333 48 330 |
| 400 | denim medio | `#5a7088` | 5 | majority | 9632 93 400, 4001 40 400 |
| 401 | azul noche | `#1a3162` | 1 | single | 4786 166 401 |
| 402 | blanco | `#f4f0e8` | 1 | single | 5107 91 402 |
| 406 | denim medio | `#5c7287` | 1 | single | 8307 48 406 |
| 407 | azul noche | `#3a4a5c` | 4 | unanimous | 7627 48 407, 9863 261 407 |
| 427 | denim medio | `#5e7389` | 4 | unanimous | 5474 67 427, 6840 82 427 |
| 428 | denim medio | `#5e7389` | 1 | single | 6840 113 428 |
| 441 | azul | `#6e8ca8` | 1 | single | 8307 59 441 |
| 485 | azul | `#6a8aa8` | 1 | single | 4333 51 485 |
| 506 | caqui | `#8a8670` | 1 | single | 340 50 506 |
| 512 | rosa palo | `#e8d2cc` | 1 | single | 5919 43 512 |
| 600 | verde | `#88a685` | 2 | split | 2562 152 600, 5247 242 600 |
| 612 | rosa palo | `#e8d4d0` | 1 | single | 2151 375 612 |
| 615 | rosa | `#d9a5a5` | 1 | single | 2370 372 615 |
| 620 | rosa palo | `#e5c9c4` | 3 | unanimous | 2127 67 620, 4786 30 620 |
| 623 | azul | `#6b8599` | 1 | single | 1201 995 623 |
| 632 | rojo | `#a84545` | 1 | single | 2797 538 632 |
| 700 | marrón | `#5c4033` | 2 | split | 2071 987 700, 2124 588 700 |
| 710 | verde menta | `#b8d4c8` | 2 | split | 2548 2 710, 6895 81 710 |
| 712 | verde | `#7a9074` | 11 | split | 5107 96 712, 2678 51 712 |
| 715 | azul marino | `#2b3e50` | 1 | single | 9632 74 715 |
| 716 | negro | `#1a1a1a` | 1 | single | 3548 56 716 |
| 725 | verde | `#88a384` | 1 | single | 2125 304 725 |
| 741 | rosa palo | `#e8d2cc` | 2 | unanimous | 2151 100 741, 2767 751 741 |
| 800 | negro | `#0f0f0f` | 18 | majority | 2702 295 800, 4786 96 800 |
| 802 | negro | `#1c1c1c` | 2 | split | 9479 68 802, 2605 538 802 |
| 819 | rosa | `#d9a8a8` | 1 | single | 6104 375 819 |
| 919 | rosa palo | `#e8c5d1` | 1 | single | 2507 43 919 |
| 932 | gris | `#8a8d8f` | 1 | single | 6027 45 932 |
| 942 | negro | `#1a1a1a` | 1 | single | 5919 2 942 |
