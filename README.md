# Decoupling Conversational State for Cost-Efficient and Latency-Stable LLM Agents

This repository contains the complete codebase, datasets, and LaTeX publication sources for a two-part empirical study on Large Language Model (LLM) context window management. The research evaluates how different memory retrieval, state compression, and multi-channel architectures affect the trade-off between semantic retention and operational overhead (financial cost and latency stability).

A formal academic paper detailing this work is available in the [paper/](paper/) directory.

---

## Project Motivation
The primary motivation behind this project was the development of a production-ready conversational artificial intelligence chat assistant. In such systems, transmitting the full conversation history to the model on every turn ensures maximum context retention, yet this approach leads to linear cost escalation and context overflow. This research was conducted to design and evaluate algorithmic strategies that minimize token consumption and operational costs while maintaining high-quality context preservation and system performance.

---

## Key Achievements
* **1.6K LLM Experiments**: Processed over 1,600 conversational episodes under controlled conditions to gather rigorous, turn-by-turn latency, cost, and Heuristic Context Preservation Score (HCPS) statistics.
* **46% Operational Cost Reduction**: Demonstrated that managed context strategies cut prompt token overhead and operational expenditures by approximately 46% compared to raw history baselines.
* **The RAG Latency Penalty**: Documented a severe performance risk in simple semantic retrieval systems, where vector search operations introduce up to a 2.32x worst-case tail-latency amplification.
* **Multi-Channel Stabilization**: Designed a modular composite architecture that achieves peak progressive Heuristic Context Preservation Score (HCPS) of 0.564 while stabilizing worst-case response times to 1.55x.

---

## Directory Structure
The workspace is organized into three main directories:

* **[Part1/](Part1/)**: Core code, datasets, and written documentation for Experiment 1. This phase establishes the baseline comparison between unmanaged history, sliding windows, and basic semantic memory retrieval.
* **[Part2/](Part2/)**: Modular codebase, decoupled components, and complete metrics for Experiment 2. This phase introduces the composite strategy framework, evaluating combinations of short-term, compressed semantic, and summarized episodic channels.
* **[paper/](paper/)**: LaTeX source code, bibliography, and figures for the formal research paper.

---

## Summary of Experiments

### Phase 1: Baseline Context Management
Experiment 1 evaluated three archetypal configurations across 375 episodes utilizing the `gpt-5-mini` model under controlled semantic distraction:
1. **Full History**: Injected the complete verbatim conversation history (unmanaged control).
2. **Sliding Window**: Restrained context to the last six turns ($N=6$).
3. **Memory-Based Retrieval**: Retained the last four messages and dynamically injected the three most semantically relevant historical fragments ($N=4, K=3$).

#### Baseline Performance Summary (Mean per Turn)
| Configuration | Input Tokens | Output Tokens | Embedding Tokens | Latency Mean (ms) | Latency Worst-Case Amp | Cost per Turn (USD) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **A_FullHistory** | 16,733 | 1,440 | 0 | 16,853 | 1.57x | $0.0071 |
| **B_SlidingWindow** | 4,800 | 1,352 | 0 | 16,304 | 2.20x | $0.0039 |
| **C_MemoryBased** | 2,542 | 1,403 | 1,464 | 16,878 | 2.32x | $0.0038 |

The baseline results show that while managed strategies cut costs by approximately 46%, simple vector-based memory introduces significant tail-latency risks (2.32x amplification) compared to the unmanaged baseline.

---

### Phase 2: Decoupled Multi-Channel Composite Architectures
To address the latency spikes and context preservation limitations of monolithic memory, Experiment 2 evaluated a modular cognitive model. Conversations were split into three specialized channels:
* **Temporal Working Memory** (`RecentHistoryComponent`): Verbatim recent conversation.
* **Semantic State Memory** (`PlainContextComponent` / `StructuredContextComponent`): Running facts and constraints summarized by a lightweight auxiliary model (`gpt-5-nano`).
* **Episodic Memory** (`PlainMemoryComponent` / `SummarizedMemoryStrategy`): Sparse retrieval of historical facts.

Ten configurations were tested across 1,280 episodes representing diverse conversation profiles (Early Facts, Parameter Overrides, Accumulation, and High Semantic Noise).

#### Advanced Strategy Comparison (Selected Configurations)
| Configuration | Code Module Composition | Progressive HCPS | Latency Mean (ms) | Latency CV (%) | Latency Worst-Case Amp | Cost per Turn (USD) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **S1_HistoryOnly** | RecentHistory ($N=5$) | 0.490 | 16,221 | 31.3% | 1.73x | $0.0086 |
| **S4_HistoryPlainMemory** | RecentHistory + PlainMemory | 0.550 | 14,790 | 34.8% | 2.01x | $0.0086 |
| **S8_HistoryPlainContextPlainMemory** | RecentHistory + PlainContext + PlainMemory | **0.564** | 15,324 | 31.8% | **1.55x** | $0.0108 |
| **S10_FullComposite** | RecentHistory + StructuredContext + PlainContext + SummarizedMemory | 0.527 | 16,386 | 31.1% | 1.47x | $0.0116 |

The advanced results demonstrate that **S8 (History + Plain Context + Plain Memory)** achieves peak progressive HCPS (0.564) while successfully mitigating the RAG tail-latency risk, reducing worst-case response amplification to 1.55x.

---

## Code Execution & Metrics Generation
To verify the metrics or execute the analysis pipelines locally, navigate to the respective experiment directory and run the TypeScript entry points.

### Prerequisites
Install the required packages using Node Package Manager:
```bash
npm install
```

### Run Experiment Suite (Part 2)
To run the full multi-channel simulator across all configurations:
```bash
npx ts-node core/runner.ts
```

### Run Metrics Processor
To process raw JSON logs and compile suite metrics under the `metrics/` output folder:
```bash
npx ts-node run-metrics.ts
```
Processed metrics will compile into `metrics/suiteMetrics_Experiment 2.json`.

---

## Citation
If you utilize this research or codebase in your work, please cite the preprint paper:
```bibtex
@article{pantigoso2026decoupling,
  title={Decoupling Conversational State: Multi-Channel Context Architectures for Cost-Efficient and Latency-Stable LLM Agents},
  author={Pantigoso Aguilar, Robert Gianfranko},
  journal={arXiv preprint arXiv:2606.XXXXX},
  year={2026}
}
```
