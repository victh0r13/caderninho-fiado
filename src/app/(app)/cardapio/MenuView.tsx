"use client";

import { useState, useTransition } from "react";
import { deleteProduct, saveProduct } from "@/app/actions";
import { useApp } from "@/components/AppShell";
import { EmptyState, Modal, MoneyInput, PageHeader, cx, useConfirm, useToast } from "@/components/ui";
import { moneyPlain } from "@/lib/format";
import type { Product } from "@/lib/types";

export function MenuView() {
  const { data } = useApp();
  const [editing, setEditing] = useState<Product | null | "new">(null);
  const categories = Array.from(new Set(data.products.map((p) => p.category)));

  return (
    <div className="animate-in">
      <PageHeader
        title="Cardápio"
        subtitle="Os produtos viram botões na hora de anotar. Mudar um preço não altera fiados já anotados."
        actions={
          <button className="btn btn-primary" onClick={() => setEditing("new")}>
            Novo produto
          </button>
        }
      />

      {data.products.length === 0 ? (
        <EmptyState
          title="Cardápio vazio."
          text="Cadastre os lanches para anotar fiado com um toque."
          action={
            <button className="btn btn-primary" onClick={() => setEditing("new")}>
              Novo produto
            </button>
          }
        />
      ) : (
        <div className="grid gap-x-14 gap-y-10 md:grid-cols-2">
          {categories.map((cat) => (
            <section key={cat}>
              <h2 className="mb-1 font-serif text-[22px]">{cat}</h2>
              <ul className="border-t border-line">
                {data.products
                  .filter((p) => p.category === cat)
                  .map((p) => (
                    <li key={p.id}>
                      <button
                        onClick={() => setEditing(p)}
                        className={cx(
                          "flex w-full items-baseline border-b border-line py-2.5 text-left text-[14.5px] transition-colors hover:bg-surface",
                          !p.active && "text-ink-3",
                        )}
                      >
                        <span>{p.name}</span>
                        {!p.active && <span className="ml-2 text-[12px]">fora do cardápio</span>}
                        <span className="leader" />
                        <span className="figure text-[16px]">{moneyPlain(p.price)}</span>
                      </button>
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {editing && <ProductDialog product={editing === "new" ? null : editing} categories={categories} onClose={() => setEditing(null)} />}
    </div>
  );
}

function ProductDialog({ product, categories, onClose }: { product: Product | null; categories: string[]; onClose: () => void }) {
  const [name, setName] = useState(product?.name ?? "");
  const [price, setPrice] = useState(product?.price ?? 0);
  const [category, setCategory] = useState(product?.category ?? categories[0] ?? "Salgados");
  const [active, setActive] = useState(product?.active ?? true);
  const [pending, start] = useTransition();
  const confirm = useConfirm();
  const toast = useToast();

  const submit = () =>
    start(async () => {
      try {
        await saveProduct({ id: product?.id, name, price, emoji: product?.emoji ?? "", category, active });
        toast({ kind: "success", text: product ? "Produto atualizado." : "Produto adicionado." });
        onClose();
      } catch (e) {
        toast({ kind: "error", text: (e as Error).message });
      }
    });

  const remove = async () => {
    if (!product) return;
    const ok = await confirm({
      title: `Remover ${product.name}?`,
      message: "Fiados antigos com este produto continuam no histórico. Para esconder só por um tempo, desmarque “No cardápio”.",
      confirmLabel: "Remover",
      danger: true,
    });
    if (!ok) return;
    await deleteProduct(product.id);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={product ? product.name : "Novo produto"}
      footer={
        <div className="flex items-center gap-2">
          {product && (
            <button className="btn btn-ghost mr-auto text-debt" onClick={remove}>
              Remover
            </button>
          )}
          <button className="btn btn-secondary ml-auto" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" disabled={pending || !name.trim()} onClick={submit}>
            Salvar
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">Nome</label>
          <input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Coxinha" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Preço</label>
            <MoneyInput value={price} onChange={setPrice} onEnter={submit} />
          </div>
          <div>
            <label className="label">Categoria</label>
            <input className="input" list="cats" value={category} onChange={(e) => setCategory(e.target.value)} />
            <datalist id="cats">
              {["Salgados", "Bebidas", "Doces", "Lanches", "Frutas", ...categories]
                .filter((v, i, a) => a.indexOf(v) === i)
                .map((c) => (
                  <option key={c} value={c} />
                ))}
            </datalist>
          </div>
        </div>
        <label className="flex cursor-pointer items-center gap-2.5 text-[13.5px]">
          <input type="checkbox" className="accent-[var(--ink)]" checked={active} onChange={(e) => setActive(e.target.checked)} />
          No cardápio (aparece na hora de anotar)
        </label>
      </div>
    </Modal>
  );
}
