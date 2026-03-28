const DB = "https://trizon-oficial-default-rtdb.firebaseio.com/";
let user = null, estoqueLocal = {}, pedidosLocal = {}, carrinho = [], itensDespacho = [], editandoID = null, pedidoAtivoID = null;

const api = {
    async call(path, method = 'GET', body = null) {
        const r = await fetch(`${DB}${path}.json`, { method, body: body ? JSON.stringify(body) : null });
        return await r.json();
    }
};

setInterval(() => { document.getElementById('clock').innerText = new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}); }, 1000);

const auth = {
    async login() {
        const u = document.getElementById('log-user').value;
        const p = document.getElementById('log-pass').value;
        const data = await api.call('usuarios');
        for (let id in data) {
            if (data[id].nome === u && data[id].senha === p) {
                user = data[id];
                document.getElementById('login-screen').style.display = 'none';
                document.getElementById('main-app').style.display = 'grid';
                if(user.role === 'admin') document.querySelectorAll('.admin-view').forEach(e => e.style.display = 'block');
                app.nav(user.role === 'admin' ? 'dash' : 'pedido');
                return;
            }
        }
        alert("Login incorreto!");
    }
};

const app = {
    async nav(id) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById('sec-' + id).classList.add('active');
        estoqueLocal = await api.call('estoque') || {};
        pedidosLocal = await api.call('pedidos') || {};
        if(id === 'estoque') estoque.render();
        if(id === 'dash') dash.render();
        if(id === 'faturamento') faturamento.render();
        if(id === 'usuarios') usuarios.render();
    }
};

const estoque = {
    render(data = estoqueLocal) {
        const list = document.getElementById('list-estoque'); list.innerHTML = '';
        for (let id in data) {
            const i = data[id];
            list.innerHTML += `<tr><td>${i.codigo}</td><td>${i.nome}</td><td>${i.custo}</td><td>${i.varejo}</td><td>${i.atacado}</td><td>${i.qtd}</td>
            <td class="admin-view" style="${user.role === 'admin' ? 'display:block' : 'display:none'}">
            <button onclick="estoque.edit('${id}')">E</button><button onclick="estoque.del('${id}')">X</button></td></tr>`;
        }
    },
    openModal() { editandoID = null; document.querySelectorAll('#modal-prod input').forEach(i => i.value=""); document.getElementById('modal-prod').style.display='flex'; },
    closeModal() { document.getElementById('modal-prod').style.display='none'; },
    edit(id) {
        editandoID = id; const p = estoqueLocal[id];
        document.getElementById('e-codigo').value = p.codigo; document.getElementById('e-nome').value = p.nome;
        document.getElementById('e-custo').value = p.custo; document.getElementById('e-varejo').value = p.varejo;
        document.getElementById('e-atacado').value = p.atacado; document.getElementById('e-qtd').value = p.qtd;
        document.getElementById('modal-prod').style.display='flex';
    },
    async save() {
        let cod = document.getElementById('e-codigo').value || Math.floor(1000 + Math.random() * 9000).toString();
        const p = { codigo: cod, nome: document.getElementById('e-nome').value, custo: document.getElementById('e-custo').value, varejo: document.getElementById('e-varejo').value, atacado: document.getElementById('e-atacado').value, qtd: document.getElementById('e-qtd').value };
        if(editandoID) await api.call(`estoque/${editandoID}`, 'PUT', p); else await api.call('estoque', 'POST', p);
        this.closeModal(); app.nav('estoque');
    },
    async del(id) { if(confirm("Excluir?")) { await api.call(`estoque/${id}`, 'DELETE'); app.nav('estoque'); } }
};

const pedidos = {
    search(v) {
        const res = document.getElementById('res-busca'); res.innerHTML = '';
        if(v.length < 1) return;
        for(let id in estoqueLocal) {
            const p = estoqueLocal[id];
            if(p.nome.toLowerCase().includes(v.toLowerCase()) || p.codigo.toString().includes(v)) {
                res.innerHTML += `<div class="win-btn full" onclick="pedidos.add('${id}')">[${p.codigo}] ${p.nome}</div>`;
            }
        }
    },
    add(id) {
        const p = estoqueLocal[id];
        carrinho.push({ id_db: id, nome: p.nome, q: 1, pr: p.varejo });
        this.renderCarrinho();
        document.getElementById('res-busca').innerHTML = ''; document.getElementById('p-busca').value = '';
    },
    renderCarrinho() {
        const list = document.getElementById('list-carrinho'); list.innerHTML = '';
        carrinho.forEach((it, i) => {
            list.innerHTML += `<tr><td>${it.nome}</td>
            <td><input type="number" value="${it.q}" oninput="carrinho[${i}].q=this.value; pedidos.calc()"></td>
            <td><input type="number" value="${it.pr}" oninput="carrinho[${i}].pr=this.value; pedidos.calc()"></td>
            <td id="sub-${i}">R$ ${(it.q * it.pr).toFixed(2)}</td>
            <td><button onclick="carrinho.splice(${i},1); pedidos.renderCarrinho()">X</button></td></tr>`;
        });
        this.calc();
    },
    calc() {
        let sub = 0; carrinho.forEach((it, i) => { let t = it.q * it.pr; sub += t; if(document.getElementById(`sub-${i}`)) document.getElementById(`sub-${i}`).innerText = `R$ ${t.toFixed(2)}`; });
        let d = document.getElementById('p-desc').value;
        document.getElementById('p-total').innerText = `Total: R$ ${(sub - (sub * (d/100))).toFixed(2)}`;
    },
    async save() {
        const nPedido = Math.floor(100000 + Math.random() * 900000); // Gerar número de pedido apenas numérico
        const p = { nPedido, cliente: document.getElementById('p-cliente').value, vendedor: user.nome, itens: carrinho, desc: document.getElementById('p-desc').value, total: document.getElementById('p-total').innerText, data: new Date().toLocaleDateString('pt-BR'), status: 'Pendente' };
        await api.call('pedidos', 'POST', p); alert("Pedido Enviado!"); carrinho = []; this.renderCarrinho();
    }
};

const dash = {
    render() {
        const list = document.getElementById('list-dash'); list.innerHTML = '';
        const search = document.getElementById('dash-search').value.toLowerCase();
        let fat = 0, pend = 0;
        for(let id in pedidosLocal) {
            const p = pedidosLocal[id];
            if(search && !(p.nPedido.toString().includes(search) || p.cliente.toLowerCase().includes(search) || p.data.includes(search))) continue;
            const v = parseFloat(p.total.replace('Total: R$ ', '')) || 0;
            if(p.status === 'Faturado') fat += v; else pend += v;
            list.innerHTML += `<tr onclick="dash.abrirDetalhes('${id}')" style="cursor:pointer"><td>${p.nPedido}</td><td>${p.cliente}</td><td>${p.data}</td><td>${p.total}</td><td>${p.status}</td>
            <td><button onclick="event.stopPropagation(); dash.del('${id}')">X</button></td></tr>`;
        }
        document.getElementById('d-fat').innerText = `R$ ${fat.toFixed(2)}`; document.getElementById('d-pend').innerText = `R$ ${pend.toFixed(2)}`;
    },
    abrirDetalhes(id) {
        pedidoAtivoID = id; const p = pedidosLocal[id];
        document.getElementById('detalhe-conteudo').innerHTML = `
            <p><b>Número:</b> ${p.nPedido}</p><p><b>Cliente:</b> ${p.cliente}</p><p><b>Vendedor:</b> ${p.vendedor}</p>
            <p><b>Status:</b> ${p.status}</p><p><b>Data Pedido:</b> ${p.data}</p>
            ${p.dataFat ? `<p><b>Data Faturamento:</b> ${p.dataFat}</p><p><b>Faturado por:</b> ${p.faturador}</p>` : ''}
            <table class="win-table"><thead><tr><th>Item</th><th>Qtd</th><th>Preço</th></tr></thead>
            <tbody>${p.itens.map(i => `<tr><td>${i.nome}</td><td>${i.q}</td><td>R$ ${i.pr}</td></tr>`).join('')}</tbody></table>
            <h3>${p.total} (Desconto: ${p.desc}%)</h3>
        `;
        document.getElementById('modal-detalhe-pedido').style.display='flex';
    },
    closeModal() { document.getElementById('modal-detalhe-pedido').style.display='none'; },
    async del(id) { if(confirm("Excluir pedido?")) { await api.call(`pedidos/${id}`, 'DELETE'); app.nav('dash'); } },
    imprimirNF() {
        const { jsPDF } = window.jspdf; const doc = new jsPDF(); const p = pedidosLocal[pedidoAtivoID];
        doc.setFillColor(200, 200, 200); doc.rect(0, 0, 210, 40, 'F');
        doc.setFontSize(22); doc.text("TRIZON IMPORTS - NOTA DE VENDA", 10, 25);
        doc.setFontSize(10); doc.text(`Nº PEDIDO: ${p.nPedido} | DATA: ${p.data}`, 10, 50);
        doc.text(`CLIENTE: ${p.clienteCompleto || p.cliente} | CPF/CNPJ: ${p.cpf || 'N/A'}`, 10, 56);
        doc.text(`VENDEDOR: ${p.vendedor} | FATURADO POR: ${p.faturador || '---'}`, 10, 62);
        doc.autoTable({ startY: 70, head: [['Produto', 'Qtd', 'Unitário', 'Total']], body: p.itens.map(i => [i.nome, i.q, `R$ ${i.pr}`, `R$ ${(i.q * i.pr).toFixed(2)}`]), headStyles: {fillColor: [0, 0, 128]} });
        let finalY = doc.lastAutoTable.finalY + 10;
        doc.text(`SUBTOTAL: ${p.total}`, 150, finalY);
        doc.text(`DESCONTO: ${p.desc}%`, 150, finalY + 6);
        doc.setFontSize(12); doc.text(`TOTAL FINAL: ${p.total}`, 150, finalY + 15);
        doc.line(10, finalY + 40, 90, finalY + 40); doc.text("ASSINATURA DO CLIENTE", 25, finalY + 45);
        doc.line(110, finalY + 40, 190, finalY + 40); doc.text("TRIZON IMPORTS LTDA", 135, finalY + 45);
        doc.save(`NF_${p.nPedido}.pdf`);
    }
};

const faturamento = {
    async render() {
        const list = document.getElementById('faturamento-list'); list.innerHTML = '';
        for(let id in pedidosLocal) {
            if(pedidosLocal[id].status === 'Pendente') {
                list.innerHTML += `<div class="window" style="margin-bottom:10px"><div class="window-body"><b>PEDIDO #${pedidosLocal[id].nPedido} - ${pedidosLocal[id].cliente}</b>
                <input type="text" id="f-nome-${id}" placeholder="Nome Completo"><input type="text" id="f-cpf-${id}" placeholder="CPF/CNPJ">
                <input type="text" id="f-contato-${id}" placeholder="Contato"><button class="win-btn" onclick="faturamento.ok('${id}')">FINALIZAR FATURAMENTO</button></div></div>`;
            }
        }
    },
    async ok(id) {
        const p = pedidosLocal[id]; p.status = 'Faturado'; p.dataFat = new Date().toLocaleDateString('pt-BR'); p.faturador = user.nome;
        p.clienteCompleto = document.getElementById(`f-nome-${id}`).value; p.cpf = document.getElementById(`f-cpf-${id}`).value;
        p.contato = document.getElementById(`f-contato-${id}`).value;
        for(let it of p.itens) { const prod = await api.call(`estoque/${it.id_db}`); if(prod) { prod.qtd -= it.q; await api.call(`estoque/${it.id_db}`, 'PUT', prod); } }
        await api.call(`pedidos/${id}`, 'PUT', p); alert("Faturado!"); app.nav('faturamento');
    }
};

const despacho = {
    search(v) {
        const res = document.getElementById('res-busca-despacho'); res.innerHTML = '';
        if(v.length < 1) return;
        for(let id in estoqueLocal) {
            const p = estoqueLocal[id];
            if(p.nome.toLowerCase().includes(v.toLowerCase()) || p.codigo.toString().includes(v)) {
                res.innerHTML += `<div class="win-btn full" onclick="despacho.add('${id}')">[${p.codigo}] ${p.nome}</div>`;
            }
        }
    },
    add(id) {
        const p = estoqueLocal[id]; itensDespacho.push({ nome: p.nome, q: 1, pr: p.varejo });
        this.render(); document.getElementById('res-busca-despacho').innerHTML = ''; document.getElementById('d-busca').value = '';
    },
    render() {
        const list = document.getElementById('list-despacho-manual'); list.innerHTML = ''; let sub = 0;
        itensDespacho.forEach((it, i) => { 
            let t = it.q * it.pr; sub += t; 
            list.innerHTML += `<tr><td>${it.nome}</td><td><input type="number" value="${it.q}" oninput="itensDespacho[${i}].q=this.value; despacho.render()"></td>
            <td><input type="number" value="${it.pr}" oninput="itensDespacho[${i}].pr=this.value; despacho.render()"></td><td>R$ ${t.toFixed(2)}</td>
            <td><button onclick="itensDespacho.splice(${i},1); despacho.render()">X</button></td></tr>`;
        });
        let d = document.getElementById('desp-desc').value;
        document.getElementById('d-total-manual').innerText = `Total: R$ ${(sub - (sub * (d/100))).toFixed(2)}`;
    },
    limpar() { itensDespacho = []; document.getElementById('desp-cliente').value = ''; this.render(); },
    gerarPDF() {
        const { jsPDF } = window.jspdf; const doc = new jsPDF();
        const cliente = document.getElementById('desp-cliente').value || "Não Informado";
        const desc = document.getElementById('desp-desc').value;
        const total = document.getElementById('d-total-manual').innerText;
        doc.setFillColor(85, 170, 170); doc.rect(0, 0, 210, 30, 'F');
        doc.setFontSize(20); doc.setTextColor(255, 255, 255); doc.text("ORDEM DE DESPACHO - TRIZON", 10, 20);
        doc.setTextColor(0, 0, 0); doc.setFontSize(10);
        doc.text(`CLIENTE: ${cliente.toUpperCase()}`, 10, 40); doc.text(`DATA: ${new Date().toLocaleDateString('pt-BR')}`, 150, 40);
        doc.autoTable({ startY: 45, head: [['Produto', 'Qtd', 'Unitário', 'Subtotal']], body: itensDespacho.map(i => [i.nome, i.q, `R$ ${i.pr}`, `R$ ${(i.q * i.pr).toFixed(2)}`]), headStyles: {fillColor: [0, 128, 128]} });
        let y = doc.lastAutoTable.finalY + 10;
        doc.text(`DESCONTO APLICADO: ${desc}%`, 10, y);
        doc.setFontSize(14); doc.text(total, 10, y + 10);
        doc.setFontSize(8); doc.text("Este documento serve para controle de saída de mercadoria e conferência.", 10, y + 30);
        doc.save(`Despacho_${cliente}.pdf`);
    }
};

const usuarios = {
    async render() {
        const u = await api.call('usuarios') || {}; const list = document.getElementById('list-users'); list.innerHTML = '';
        for(let id in u) list.innerHTML += `<tr><td>${u[id].nome}</td><td>${u[id].senha}</td><td>${u[id].role}</td><td><button onclick="usuarios.del('${id}')">X</button></td></tr>`;
    },
    async save() {
        const u = { nome: document.getElementById('u-nome').value, senha: document.getElementById('u-pass').value, role: document.getElementById('u-role').value };
        await api.call('usuarios', 'POST', u); app.nav('usuarios');
    },
    async del(id) { if(confirm("Excluir?")) { await api.call(`usuarios/${id}`, 'DELETE'); app.nav('usuarios'); } }
};

(async () => { const u = await api.call('usuarios'); if(!u) await api.call('usuarios', 'POST', {nome: 'admin', senha: '123', role: 'admin'}); })();