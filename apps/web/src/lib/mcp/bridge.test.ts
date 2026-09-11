import { afterEach, describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpPrincipal } from "./auth";

vi.mock("server-only", () => ({}));

const ORGANISATION_ID = "00000000-0000-4000-8000-000000000001";
const OTHER_ORGANISATION_ID = "00000000-0000-4000-8000-000000000002";
const CLIENT_A_ID = "10000000-0000-4000-8000-000000000001";
const CLIENT_B_ID = "10000000-0000-4000-8000-000000000002";
const USER_ID = "20000000-0000-4000-8000-000000000001";
const PRIOR_DECISION_ID = "30000000-0000-4000-8000-000000000001";

type Row = Record<string, unknown>;
type QueryResult = { data: Row[] | Row | null; error: null };
type Filter =
  | { kind: "eq" | "neq" | "is"; column: string; value: unknown }
  | { kind: "in" | "notIn"; column: string; value: unknown[] }
  | { kind: "clientOr"; value: string };

type Operation = {
  table: string;
  action: "select" | "insert" | "update";
  payload?: Row;
  filters: Filter[];
};

const generatedIds: Record<string, string> = {
  evidence_items: "40000000-0000-4000-8000-000000000001",
  decision_records: "40000000-0000-4000-8000-000000000002",
  learning_proposals: "40000000-0000-4000-8000-000000000003",
  tasks: "40000000-0000-4000-8000-000000000004",
  audit_logs: "40000000-0000-4000-8000-000000000005",
};

class FakeSupabase {
  readonly operations: Operation[] = [];

  constructor(readonly tables: Record<string, Row[]> = {}) {}

  from(table: string) {
    return new FakeQuery(this, table);
  }

  execute(
    table: string,
    action: Operation["action"],
    payload: Row | undefined,
    filters: Filter[],
    one: boolean,
  ): QueryResult {
    this.operations.push({ table, action, payload, filters: [...filters] });
    const tableRows = (this.tables[table] ??= []);

    if (action === "insert") {
      const inserted = {
        id: generatedIds[table] ?? "40000000-0000-4000-8000-000000000099",
        ...payload,
      };
      tableRows.push(inserted);
      return { data: one ? inserted : null, error: null };
    }

    const matchingRows = tableRows.filter((row) =>
      filters.every((filter) => {
        if (filter.kind === "clientOr") {
          return row.client_id === null || row.client_id === filter.value;
        }
        if (filter.kind === "in") return filter.value.includes(row[filter.column]);
        if (filter.kind === "notIn") return !filter.value.includes(row[filter.column]);
        if (filter.kind === "eq") return row[filter.column] === filter.value;
        if (filter.kind === "neq") return row[filter.column] !== filter.value;
        return row[filter.column] === filter.value;
      }),
    );

    if (action === "update") {
      for (const row of matchingRows) Object.assign(row, payload);
      return { data: one ? matchingRows[0] ?? null : null, error: null };
    }

    return { data: one ? matchingRows[0] ?? null : matchingRows, error: null };
  }
}

class FakeQuery implements PromiseLike<QueryResult> {
  private action: Operation["action"] = "select";
  private payload: Row | undefined;
  private readonly filters: Filter[] = [];
  private maximumRows: number | undefined;
  private selectedColumns: string | undefined;

  constructor(
    private readonly database: FakeSupabase,
    private readonly table: string,
  ) {}

  select(columns?: string) {
    this.selectedColumns = columns;
    return this;
  }

  insert(payload: Row) {
    this.action = "insert";
    this.payload = payload;
    return this;
  }

  update(payload: Row) {
    this.action = "update";
    this.payload = payload;
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ kind: "eq", column, value });
    return this;
  }

  neq(column: string, value: unknown) {
    this.filters.push({ kind: "neq", column, value });
    return this;
  }

  is(column: string, value: unknown) {
    this.filters.push({ kind: "is", column, value });
    return this;
  }

  in(column: string, value: unknown[]) {
    this.filters.push({ kind: "in", column, value });
    return this;
  }

  not(column: string, operator: string, value: string) {
    if (operator === "in") {
      this.filters.push({
        kind: "notIn",
        column,
        value: value.replace(/[()]/g, "").split(","),
      });
    }
    return this;
  }

  or(expression: string) {
    const match = expression.match(/^client_id\.is\.null,client_id\.eq\.([0-9a-f-]+)$/i);
    if (match?.[1]) this.filters.push({ kind: "clientOr", value: match[1] });
    return this;
  }

  order() {
    return this;
  }

  limit(value: number) {
    this.maximumRows = value;
    return this;
  }

  maybeSingle(): Promise<QueryResult> {
    return Promise.resolve(this.run(true));
  }

  single(): Promise<QueryResult> {
    return Promise.resolve(this.run(true));
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.run(false)).then(onfulfilled, onrejected);
  }

  private run(one: boolean): QueryResult {
    let result = this.database.execute(
      this.table,
      this.action,
      this.payload,
      this.filters,
      one,
    );
    if (!one && Array.isArray(result.data) && this.maximumRows !== undefined) {
      result = { ...result, data: result.data.slice(0, this.maximumRows) };
    }

    if (
      this.action === "select" &&
      this.selectedColumns &&
      !this.selectedColumns.includes("(")
    ) {
      const columns = this.selectedColumns.split(",").map((column) => column.trim());
      const project = (row: Row): Row =>
        Object.fromEntries(
          columns
            .filter((column) => column in row)
            .map((column) => [column, row[column]]),
        );
      return {
        ...result,
        data: Array.isArray(result.data)
          ? result.data.map(project)
          : result.data
            ? project(result.data)
            : null,
      };
    }

    return result;
  }
}

function baseTables(): Record<string, Row[]> {
  return {
    clients: [
      {
        id: CLIENT_A_ID,
        organisation_id: ORGANISATION_ID,
        name: "Client Alpha",
        slug: "client-alpha",
        status: "active",
        industry: "Fitness",
        deleted_at: null,
      },
      {
        id: CLIENT_B_ID,
        organisation_id: OTHER_ORGANISATION_ID,
        name: "Client Beta",
        slug: "client-beta",
        status: "active",
        industry: "Retail",
        deleted_at: null,
      },
    ],
  };
}

function principal(database: FakeSupabase): McpPrincipal {
  return {
    user: { id: USER_ID },
    userId: USER_ID,
    organisationId: ORGANISATION_ID,
    roleSlug: "agency_owner",
    accessToken: "test-access-token",
    supabase: database,
    raw: database,
  } as unknown as McpPrincipal;
}

let activeServer: McpServer | undefined;
let activeClient: Client | undefined;

async function connect(database: FakeSupabase): Promise<Client> {
  const { createIhpMcpServer } = await import("./bridge");
  const server = createIhpMcpServer(principal(database));
  const client = new Client({ name: "ihp-bridge-test", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await server.connect(serverTransport);
  await client.connect(clientTransport);
  activeServer = server;
  activeClient = client;
  return client;
}

function structuredContent(result: Awaited<ReturnType<Client["callTool"]>>): Record<string, unknown> {
  if (!("structuredContent" in result) || !result.structuredContent) {
    throw new Error("Expected structured tool content.");
  }
  return result.structuredContent as Record<string, unknown>;
}

afterEach(async () => {
  await activeClient?.close();
  await activeServer?.close();
  activeClient = undefined;
  activeServer = undefined;
});

describe("IHP MCP bridge tools", () => {
  it("scopes find_client to the principal organisation and advertises OAuth", async () => {
    const database = new FakeSupabase(baseTables());
    const client = await connect(database);

    const tools = await client.listTools();
    const descriptor = tools.tools.find((tool) => tool.name === "find_client");
    expect(descriptor?._meta).toMatchObject({
      securitySchemes: [{ type: "oauth2", scopes: [] }],
    });

    const result = await client.callTool({
      name: "find_client",
      arguments: { query: "Client" },
    });

    expect(structuredContent(result)).toMatchObject({
      clients: [{ id: CLIENT_A_ID, name: "Client Alpha" }],
    });
    expect(JSON.stringify(structuredContent(result))).not.toContain(CLIENT_B_ID);

    const query = database.operations.find(
      (operation) => operation.table === "clients" && operation.action === "select",
    );
    expect(query?.filters).toContainEqual({
      kind: "eq",
      column: "organisation_id",
      value: ORGANISATION_ID,
    });
  });

  it("capture_evidence creates raw evidence only", async () => {
    const database = new FakeSupabase(baseTables());
    const client = await connect(database);

    const result = await client.callTool({
      name: "capture_evidence",
      arguments: {
        client_id: CLIENT_A_ID,
        evidence_type: "chatgpt_conversation",
        title: "Offer discussion",
        raw_text: "The client discussed a possible offer change.",
      },
    });

    expect(structuredContent(result)).toMatchObject({ status: "raw" });
    const insertedTables = database.operations
      .filter((operation) => operation.action === "insert")
      .map((operation) => operation.table);
    expect(insertedTables).toEqual(["evidence_items", "audit_logs"]);
    expect(insertedTables).not.toContain("decision_records");
    expect(insertedTables).not.toContain("learning_proposals");
  });

  it("records a decision only after explicit invocation and preserves superseded history", async () => {
    const tables = baseTables();
    tables.decision_records = [
      {
        id: PRIOR_DECISION_ID,
        organisation_id: ORGANISATION_ID,
        client_id: CLIENT_A_ID,
        status: "confirmed",
      },
    ];
    const database = new FakeSupabase(tables);
    const client = await connect(database);

    const descriptor = (await client.listTools()).tools.find(
      (tool) => tool.name === "record_decision",
    );
    expect(descriptor?.description).toContain("only when the user explicitly confirms");
    expect(database.operations).toHaveLength(0);

    await client.callTool({
      name: "record_decision",
      arguments: {
        client_id: CLIENT_A_ID,
        decision_type: "offer",
        title: "Confirmed offer",
        decision: "Use the new confirmed offer.",
        supersedes_id: PRIOR_DECISION_ID,
      },
    });

    expect(tables.decision_records).toHaveLength(2);
    expect(tables.decision_records[0]).toMatchObject({
      id: PRIOR_DECISION_ID,
      status: "superseded",
    });
    expect(database.operations.some((operation) => operation.action === "update")).toBe(true);
    expect(database.operations.some((operation) => operation.action === "insert")).toBe(true);
  });

  it("leaves proposed learning pending approval", async () => {
    const database = new FakeSupabase(baseTables());
    const client = await connect(database);

    const result = await client.callTool({
      name: "propose_learning",
      arguments: {
        client_id: CLIENT_A_ID,
        proposed_learning: "Customers respond to a shorter onboarding promise.",
        knowledge_kind: "winning_pattern",
        title: "Short onboarding promise",
        reason_for_promotion: "Repeated in three confirmed client conversations.",
      },
    });

    expect(structuredContent(result)).toMatchObject({ status: "pending_approval" });
    const insert = database.operations.find(
      (operation) => operation.table === "learning_proposals" && operation.action === "insert",
    );
    expect(insert?.payload).toMatchObject({
      client_id: CLIENT_A_ID,
      status: "pending_approval",
    });
  });

  it("isolates every client context source from another client", async () => {
    const tables = baseTables();
    const scopedTableNames = [
      "knowledge_entries",
      "decision_records",
      "evidence_items",
      "client_services",
      "tasks",
      "projects",
      "meetings",
      "notes",
    ];
    for (const table of scopedTableNames) {
      tables[table] = [
        {
          id: `${table}-agency`,
          organisation_id: ORGANISATION_ID,
          client_id: table === "knowledge_entries" ? null : CLIENT_A_ID,
          status: table === "knowledge_entries" ? "active" : "confirmed",
          deleted_at: null,
          title: `${table} agency or alpha`,
          updated_at: "2026-09-01T00:00:00.000Z",
          effective_at: "2026-09-01T00:00:00.000Z",
          captured_at: "2026-09-01T00:00:00.000Z",
        },
        {
          id: `${table}-client-b`,
          organisation_id: ORGANISATION_ID,
          client_id: CLIENT_B_ID,
          status: table === "knowledge_entries" ? "active" : "confirmed",
          deleted_at: null,
          title: `${table} client beta secret`,
          updated_at: "2026-09-02T00:00:00.000Z",
          effective_at: "2026-09-02T00:00:00.000Z",
          captured_at: "2026-09-02T00:00:00.000Z",
        },
      ];
    }

    const database = new FakeSupabase(tables);
    const client = await connect(database);
    const result = await client.callTool({
      name: "get_client_context",
      arguments: { client_id: CLIENT_A_ID },
    });
    const content = structuredContent(result);

    expect(JSON.stringify(content)).not.toContain("client beta secret");
    expect(JSON.stringify(content)).not.toContain("client-b");

    for (const table of scopedTableNames.filter((name) => name !== "knowledge_entries")) {
      const query = database.operations.find(
        (operation) => operation.table === table && operation.action === "select",
      );
      expect(query?.filters).toContainEqual({
        kind: "eq",
        column: "client_id",
        value: CLIENT_A_ID,
      });
    }
    const knowledgeQuery = database.operations.find(
      (operation) => operation.table === "knowledge_entries",
    );
    expect(knowledgeQuery?.filters).toContainEqual({ kind: "clientOr", value: CLIENT_A_ID });
  });

  it("writes an audit row for every exposed mutation", async () => {
    const database = new FakeSupabase(baseTables());
    const client = await connect(database);

    await client.callTool({
      name: "capture_evidence",
      arguments: {
        client_id: CLIENT_A_ID,
        evidence_type: "manual_observation",
        title: "Observation",
        raw_text: "Observed fact",
      },
    });
    await client.callTool({
      name: "record_decision",
      arguments: {
        client_id: CLIENT_A_ID,
        decision_type: "strategy",
        title: "Strategy decision",
        decision: "Proceed with the confirmed strategy.",
      },
    });
    await client.callTool({
      name: "propose_learning",
      arguments: {
        client_id: CLIENT_A_ID,
        proposed_learning: "Candidate learning",
        knowledge_kind: "playbook",
        title: "Candidate playbook",
        reason_for_promotion: "Review this candidate.",
      },
    });
    await client.callTool({
      name: "create_task",
      arguments: {
        client_id: CLIENT_A_ID,
        title: "Follow up on bridge evidence",
      },
    });

    const auditInserts = database.operations.filter(
      (operation) => operation.table === "audit_logs" && operation.action === "insert",
    );
    expect(auditInserts).toHaveLength(4);
    expect(auditInserts.map((operation) => operation.payload?.resource)).toEqual([
      "evidence_item",
      "decision_record",
      "learning_proposal",
      "task",
    ]);
  });
});
