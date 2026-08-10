# Operating model architecture

These files define the portable operating-model layer for IHP OS.

- [`operating-model.md`](operating-model.md): canonical OS → Identity → App → Plugin → Task architecture, the audit mapping from the existing codebase, and what is implemented versus scaffolded.
- [`client-adapter.template.json`](client-adapter.template.json): safe placeholder template for a client adapter. No live secrets or client-specific private facts belong in this file.
