import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import postgres from "postgres";
import { loadEnv } from "vite";

test("blank cards, details, drag and theme survive reloads", async ({
  page,
}, testInfo) => {
  const env = loadEnv("development", process.cwd(), "");
  const url = process.env["DATABASE_URL"] ?? env["DATABASE_URL"];
  test.skip(
    !url || !["localhost", "127.0.0.1"].includes(new URL(url).hostname),
    "Requires a local test database",
  );
  const sql = postgres(url!, { max: 1 });
  const id = randomUUID();
  const email = "rayo-ux-" + id + "@example.test";
  const password = "Local-test-" + id;
  try {
    // A dedicated verified fixture avoids sending authentication emails.
    await sql`insert into "user" (id, name, email, email_verified) values (${id}, 'Teste de experiência', ${email}, true)`;
    await sql`insert into account (id, account_id, provider_id, user_id, password) values (${randomUUID()}, ${id}, 'credential', ${id}, ${await hashPassword(password)})`;
    await page.goto("/login");
    await page.waitForFunction(
      () => document.documentElement.style.colorScheme !== "",
    );
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha").fill(password);
    const signInResponse = page.waitForResponse((response) =>
      response.url().includes("/sign-in/email"),
    );
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    const signIn = await signInResponse;
    expect(signIn.ok(), signIn.ok() ? "" : await signIn.text()).toBe(true);
    await expect(
      page.getByRole("heading", { name: "Seu espaço, seu ritmo" }),
    ).toBeVisible();
    await page.goto("/");
    await page.waitForFunction(
      () => document.documentElement.style.colorScheme !== "",
    );
    await page.waitForLoadState("networkidle");
    await page
      .getByRole("button", { name: "Novo projeto", exact: true })
      .click();
    await page.getByLabel("Nome do projeto").fill("Projeto de teste");
    await page
      .getByRole("button", { name: "Criar projeto", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Projeto de teste", exact: true }),
    ).toBeVisible();
    await page.goto("/tasks");
    await page.waitForFunction(
      () => document.documentElement.style.colorScheme !== "",
    );
    await page.waitForLoadState("networkidle");
    await page
      .getByRole("button", { name: "Nova tarefa", exact: true })
      .first()
      .click();
    await page
      .getByRole("button", { name: "Abrir tarefa sem título", exact: true })
      .click();
    await expect(page.getByLabel("Título", { exact: true })).toHaveValue("");
    await page
      .getByLabel("Título", { exact: true })
      .fill("Revisar experiência");
    await page
      .getByLabel("Descrição", { exact: true })
      .fill("Validar detalhes persistidos e movimento entre colunas.");
    await page.getByLabel("Prazo", { exact: true }).fill("2026-10-15");
    await page.screenshot({
      path: testInfo.outputPath("detalhes-da-tarefa.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Salvar alterações" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    const doing = page.getByRole("region", {
      name: "Em andamento",
      exact: true,
    });
    if (testInfo.project.name === "desktop") {
      const handle = await page
        .getByRole("button", { name: "Arrastar Revisar experiência" })
        .boundingBox();
      const target = await doing.boundingBox();
      await page.mouse.move(
        handle!.x + handle!.width / 2,
        handle!.y + handle!.height / 2,
      );
      await page.mouse.down();
      await page.mouse.move(target!.x + target!.width / 2, target!.y + 160, {
        steps: 12,
      });
      await expect(doing).toHaveClass(/is-drop-target/);
      await page.mouse.up();
    } else {
      await page
        .getByRole("combobox", { name: "Status de Revisar experiência" })
        .click();
      await page
        .getByRole("option", { name: "Em andamento", exact: true })
        .click();
    }
    await expect(
      doing.getByRole("button", { name: "Abrir Revisar experiência" }),
    ).toBeVisible();
    await expect(page.getByRole("status")).toContainText("Em andamento");
    await page
      .getByRole("combobox", { name: "Status de Revisar experiência" })
      .click();
    await page.getByRole("option", { name: "Concluído", exact: true }).click();
    await expect(
      page
        .getByRole("region", { name: "Concluído", exact: true })
        .getByRole("button", { name: "Abrir Revisar experiência" }),
    ).toBeVisible();
    await page
      .getByRole("combobox", { name: "Status de Revisar experiência" })
      .click();
    await page
      .getByRole("option", { name: "Em andamento", exact: true })
      .click();
    await page.reload();
    await page.waitForFunction(
      () => document.documentElement.style.colorScheme !== "",
    );
    await page.waitForLoadState("networkidle");
    await expect(
      doing.getByRole("button", { name: "Abrir Revisar experiência" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Abrir Revisar experiência" })
      .click();
    await expect(page.getByLabel("Descrição", { exact: true })).toHaveValue(
      "Validar detalhes persistidos e movimento entre colunas.",
    );
    await expect(page.getByLabel("Prazo", { exact: true })).toHaveValue(
      "2026-10-15",
    );
    await page.getByRole("button", { name: "Fechar detalhes" }).click();
    const dark = page.getByRole("button", { name: "Ativar tema escuro" });
    await expect(dark).toBeVisible();
    await dark.click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.reload();
    await page.waitForFunction(
      () => document.documentElement.style.colorScheme !== "",
    );
    await page.waitForLoadState("networkidle");
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.screenshot({
      path: testInfo.outputPath("kanban-dark.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Ativar tema claro" }).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await page.waitForTimeout(250);
    await page.screenshot({
      path: testInfo.outputPath("kanban-light.png"),
      fullPage: true,
    });
    await page.goto("/overview");
    await page.waitForFunction(
      () => document.documentElement.style.colorScheme !== "",
    );
    await page.screenshot({
      path: testInfo.outputPath("overview.png"),
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  } finally {
    await sql`delete from "user" where id = ${id}`;
    await sql.end();
  }
});
