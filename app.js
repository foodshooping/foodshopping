// ================================================================
// FOOD SHOPPING - LÓGICA PRINCIPAL
// ================================================================

// ============ BURBUJAS FLOTANTES ============
(function(){
  const wrap=document.getElementById('bubbles');
  if(!wrap) return;
  for(let i=0;i<15;i++){
    const b=document.createElement('div');
    b.className='bubble';
    const size=Math.random()*80+20;
    b.style.width=size+'px';
    b.style.height=size+'px';
    b.style.left=Math.random()*100+'%';
    b.style.animationDuration=(Math.random()*15+12)+'s';
    b.style.animationDelay=(Math.random()*10)+'s';
    wrap.appendChild(b);
  }
})();

// ============ UTILIDADES ============
function showToast(msg,type){
  const t=document.getElementById('toast');
  t.textContent=msg;
  t.className='toast '+(type||'');
  setTimeout(()=>t.classList.add('show'),10);
  setTimeout(()=>t.classList.remove('show'),2500);
}

function showMessage(msg,type){
  const el=document.getElementById('authMessage');
  el.textContent=msg;
  el.className='message '+type;
}

function showView(id){
  ['viewLogin','viewUsuario','viewCocinera'].forEach(v=>
    document.getElementById(v).classList.add('hidden')
  );
  document.getElementById(id).classList.remove('hidden');
}

// ============ TABS LOGIN/REGISTRO ============
document.querySelectorAll('.tab').forEach(tab=>{
  tab.addEventListener('click',()=>{
    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    document.querySelectorAll('.form').forEach(f=>f.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(tab.dataset.tab+'Form').classList.add('active');
    document.getElementById('authMessage').textContent='';
  });
});

// ============ TOGGLE LOGIN (CORREO/NIE) ============
let loginMode='email';
document.querySelectorAll('[data-login-mode]').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('[data-login-mode]').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    loginMode=btn.dataset.loginMode;
    document.getElementById('loginEmailGroup').classList.toggle('hidden',loginMode!=='email');
    document.getElementById('loginNieGroup').classList.toggle('hidden',loginMode!=='nie');
  });
});

// ============ TOGGLE REGISTRO (CORREO/NIE) ============
let regMode='email';
document.querySelectorAll('[data-reg-mode]').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('[data-reg-mode]').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    regMode=btn.dataset.regMode;
    document.getElementById('regEmailGroup').classList.toggle('hidden',regMode!=='email');
    document.getElementById('regNieGroup').classList.toggle('hidden',regMode!=='nie');
  });
});

// ============ REGISTRO ============
document.getElementById('registerForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const btn=document.getElementById('registerBtn');
  btn.disabled=true;
  btn.textContent='Creando cuenta...';

  const name=document.getElementById('regName').value.trim();
  const password=document.getElementById('regPassword').value;
  const role=document.getElementById('regRole').value;
  let email=null, nie=null;

  if(regMode==='email'){
    email=document.getElementById('regEmail').value.trim().toLowerCase();
    if(!email){
      showMessage('Ingresa tu correo','error');
      btn.disabled=false;btn.textContent='Crear cuenta';
      return;
    }
  }else{
    nie=document.getElementById('regNie').value.trim();
    if(!nie){
      showMessage('Ingresa tu NIE','error');
      btn.disabled=false;btn.textContent='Crear cuenta';
      return;
    }
    if(!/^\d{6,10}$/.test(nie)){
      showMessage('El NIE debe tener 6-10 dígitos','error');
      btn.disabled=false;btn.textContent='Crear cuenta';
      return;
    }
  }

  const { data, error } = await supabaseClient
    .from('usuarios')
    .insert([{ name, email, nie, password, role }])
    .select()
    .single();

  btn.disabled=false;
  btn.textContent='Crear cuenta';

  if(error){
    if(error.code==='23505') showMessage('Ese correo o NIE ya está registrado','error');
    else showMessage('Error: '+error.message,'error');
    return;
  }

  showMessage('¡Cuenta creada! Iniciando sesión...','success');
  setTimeout(()=>loginUser(data),900);
});

// ============ LOGIN ============
document.getElementById('loginForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const btn=document.getElementById('loginBtn');
  btn.disabled=true;
  btn.textContent='Verificando...';

  const password=document.getElementById('loginPassword').value;
  let query=supabaseClient.from('usuarios').select('*').eq('password',password);

  if(loginMode==='email'){
    const email=document.getElementById('loginEmail').value.trim().toLowerCase();
    if(!email){
      showMessage('Ingresa tu correo','error');
      btn.disabled=false;btn.textContent='Ingresar';
      return;
    }
    query=query.eq('email',email);
  }else{
    const nie=document.getElementById('loginNie').value.trim();
    if(!nie){
      showMessage('Ingresa tu NIE','error');
      btn.disabled=false;btn.textContent='Ingresar';
      return;
    }
    query=query.eq('nie',nie);
  }

  const { data, error } = await query.maybeSingle();

  btn.disabled=false;
  btn.textContent='Ingresar';

  if(error || !data){
    showMessage('Credenciales incorrectas','error');
    return;
  }

  showMessage('¡Bienvenido, '+data.name+'!','success');
  setTimeout(()=>loginUser(data),500);
});

// ============ LOGIN EXITOSO ============
function loginUser(user){
  localStorage.setItem('foodreserve_session',JSON.stringify(user));
  if(user.role==='cocinera') openChef();
  else openUser();
}

// ============ VARIABLES GLOBALES ============
let menu=[];
let cart=[];
let orders=[];

// ============ DETECCIÓN DE DISPOSITIVO ============
function detectDevice(){
  const ua=navigator.userAgent;
  const isMobile=/Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(ua);
  const isTablet=/iPad|Android(?!.*Mobile)/i.test(ua);
  const dev=isTablet?'📱 Tablet':isMobile?'📱 Móvil':'💻 Computadora';
  return `${dev} detectado • Pantalla ${window.innerWidth}x${window.innerHeight}px`;
}

// ============ ABRIR PANEL USUARIO ============
async function openUser(){
  const s=JSON.parse(localStorage.getItem('foodreserve_session'));
  document.getElementById('userName').textContent=s.name;
  document.getElementById('deviceInfo').textContent=detectDevice();
  showView('viewUsuario');
  await loadMenu();
  renderMenuUser();
  renderCart();
}

window.addEventListener('resize',()=>{
  const el=document.getElementById('deviceInfo');
  if(el && !document.getElementById('viewUsuario').classList.contains('hidden'))
    el.textContent=detectDevice();
});

// ============ CARGAR MENÚ DESDE SUPABASE ============
async function loadMenu(){
  const { data, error } = await supabaseClient
    .from('menu')
    .select('*')
    .order('id');
  if(error){ console.error(error); return; }
  menu=data||[];
}

// ============ RENDERIZAR MENÚ (USUARIO) ============
function renderMenuUser(){
  const c=document.getElementById('menuListUser');
  c.innerHTML='';
  if(menu.length===0){
    c.innerHTML='<p class="empty-msg">No hay platillos disponibles</p>';
    return;
  }
  menu.forEach((dish,i)=>{
    const card=document.createElement('div');
    card.className='menu-card';
    card.style.animationDelay=(i*.08)+'s';
    card.innerHTML=`
      <span class="emoji">${dish.emoji||'🍴'}</span>
      <h4>${dish.name}</h4>
      <span class="type">${dish.type}</span>
      <div class="price">$${parseFloat(dish.price).toFixed(2)}</div>`;
    card.addEventListener('click',()=>addToCart(dish));
    c.appendChild(card);
  });
}

// ============ AGREGAR AL CARRITO ============
function addToCart(dish){
  const ex=cart.find(i=>i.id===dish.id);
  if(ex) ex.qty++;
  else cart.push({...dish,price:parseFloat(dish.price),qty:1});
  renderCart();
  showToast('✅ '+dish.name+' agregado','success');
}

// ============ RENDERIZAR CARRITO ============
function renderCart(){
  const c=document.getElementById('orderList');
  if(cart.length===0){
    c.innerHTML='<p class="empty-msg">Aún no has agregado nada</p>';
    document.getElementById('totalPrice').textContent='0.00';
    return;
  }
  c.innerHTML='';
  let total=0;
  cart.forEach((item,i)=>{
    total+=item.price*item.qty;
    const d=document.createElement('div');
    d.className='order-item';
    d.style.animationDelay=(i*.05)+'s';
    d.innerHTML=`
      <div class="order-item-info">
        <span>${item.emoji}</span>
        <div><strong>${item.name}</strong><br><small>$${item.price.toFixed(2)} c/u</small></div>
      </div>
      <div class="qty-controls">
        <button class="qty-btn" data-action="minus" data-id="${item.id}">−</button>
        <span>${item.qty}</span>
        <button class="qty-btn" data-action="plus" data-id="${item.id}">+</button>
      </div>`;
    c.appendChild(d);
  });
  document.getElementById('totalPrice').textContent=total.toFixed(2);
  c.querySelectorAll('.qty-btn').forEach(b=>{
    b.addEventListener('click',()=>{
      const id=b.dataset.id;
      const item=cart.find(i=>String(i.id)===String(id));
      if(b.dataset.action==='plus') item.qty++;
      else{
        item.qty--;
        if(item.qty<=0) cart=cart.filter(i=>String(i.id)!==String(id));
      }
      renderCart();
    });
  });
}

// ============ ENVIAR PEDIDO ============
document.getElementById('sendOrderBtn').addEventListener('click',async ()=>{
  if(cart.length===0){ showToast('Tu pedido está vacío','error'); return; }
  const btn=document.getElementById('sendOrderBtn');
  btn.disabled=true;
  btn.textContent='Enviando...';

  const s=JSON.parse(localStorage.getItem('foodreserve_session'));
  const total=cart.reduce((a,i)=>a+i.price*i.qty,0);

  const { error } = await supabaseClient.from('pedidos').insert([{
    user_id: s.id,
    user_name: s.name,
    items: cart,
    total: total.toFixed(2),
    status: 'pendiente'
  }]);

  btn.disabled=false;
  btn.textContent='Enviar Pedido';

  if(error){ showToast('Error al enviar','error'); console.error(error); return; }

  cart=[];
  renderCart();
  showToast('🎉 ¡Pedido enviado a la cocinera!','success');
});

// ============ LOGOUT USUARIO ============
document.getElementById('logoutUserBtn').addEventListener('click',()=>{
  localStorage.removeItem('foodreserve_session');
  showView('viewLogin');
});
// ============ ABRIR PANEL COCINERA ============
async function openChef(){
  const s=JSON.parse(localStorage.getItem('foodreserve_session'));
  document.getElementById('chefName').textContent=s.name;
  showView('viewCocinera');
  await loadMenu();
  renderMenuChef();
  await loadOrders();
}

// ============ CARGAR PEDIDOS DESDE SUPABASE ============
async function loadOrders(){
  const { data, error } = await supabaseClient
    .from('pedidos')
    .select('*')
    .order('id',{ascending:false});
  if(error){ console.error(error); return; }
  orders=data||[];
  renderOrders();
}

// ============ RENDERIZAR MENÚ (COCINERA) ============
function renderMenuChef(){
  const c=document.getElementById('menuListChef');
  c.innerHTML='';
  if(menu.length===0){
    c.innerHTML='<p class="empty-msg">No hay platillos</p>';
    return;
  }
  menu.forEach((dish,i)=>{
    const card=document.createElement('div');
    card.className='menu-card';
    card.style.animationDelay=(i*.08)+'s';
    card.innerHTML=`
      <span class="emoji">${dish.emoji||'🍴'}</span>
      <h4>${dish.name}</h4>
      <span class="type">${dish.type}</span>
      <div class="price">$${parseFloat(dish.price).toFixed(2)}</div>
      <button class="btn-delete" style="margin-top:10px;width:100%">Eliminar</button>`;
    card.querySelector('.btn-delete').addEventListener('click',async ev=>{
      ev.stopPropagation();
      await supabaseClient.from('menu').delete().eq('id',dish.id);
      await loadMenu();
      renderMenuChef();
      renderMenuUser();
      showToast('Platillo eliminado','success');
    });
    c.appendChild(card);
  });
}

// ============ AGREGAR PLATILLO AL MENÚ ============
document.getElementById('addMenuForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const dish={
    name: document.getElementById('dishName').value.trim(),
    type: document.getElementById('dishType').value,
    price: parseFloat(document.getElementById('dishPrice').value),
    emoji: document.getElementById('dishEmoji').value.trim() || '🍴'
  };
  const { error } = await supabaseClient.from('menu').insert([dish]);
  if(error){ showToast('Error al agregar','error'); console.error(error); return; }
  await loadMenu();
  renderMenuChef();
  renderMenuUser();
  e.target.reset();
  showToast('✅ Platillo agregado','success');
});

// ============ RENDERIZAR PEDIDOS (COCINERA) ============
function renderOrders(){
  const c=document.getElementById('ordersList');
  const pend=orders.filter(o=>o.status==='pendiente');
  document.getElementById('stats').textContent=
    `${pend.length} pedido${pend.length!==1?'s':''} pendiente${pend.length!==1?'s':''}`;

  if(orders.length===0){
    c.innerHTML='<p class="empty-msg">No hay pedidos aún</p>';
    return;
  }
  c.innerHTML='';

  const sorted=[...orders].sort((a,b)=>{
    if(a.status===b.status) return b.id-a.id;
    return a.status==='pendiente' ? -1 : 1;
  });

  sorted.forEach((o,i)=>{
    const card=document.createElement('div');
    card.className='order-card'+(o.status==='pendiente'?' new':'');
    card.style.animationDelay=(i*.08)+'s';

    const itemsArr=Array.isArray(o.items)?o.items:[];
    const items=itemsArr.map(it=>
      `<li>${it.emoji} <strong>${it.qty}x</strong> ${it.name} — $${(it.price*it.qty).toFixed(2)}</li>`
    ).join('');

    const fecha=new Date(o.created_at).toLocaleString('es-ES');

    card.innerHTML=`
      <div class="order-card-header">
        <h4>👤 ${o.user_name}</h4>
        <span class="status-badge ${o.status==='pendiente'?'status-pending':'status-done'}">
          ${o.status==='pendiente'?'Pendiente':'Completado'}
        </span>
      </div>
      <p class="timestamp">🕐 ${fecha}</p>
      <ul class="order-items">${items}</ul>
      <div style="font-weight:700;color:var(--secondary);margin-bottom:10px">
        Total: $${parseFloat(o.total).toFixed(2)}
      </div>
      <div class="actions">
        ${o.status==='pendiente'?'<button class="btn-complete">✓ Marcar completado</button>':''}
        <button class="btn-delete">🗑 Eliminar</button>
      </div>`;

    const cb=card.querySelector('.btn-complete');
    if(cb) cb.addEventListener('click',async ()=>{
      await supabaseClient.from('pedidos').update({status:'completado'}).eq('id',o.id);
      await loadOrders();
      showToast('✅ Pedido completado','success');
    });

    card.querySelector('.btn-delete').addEventListener('click',async ()=>{
      if(!confirm('¿Eliminar este pedido?')) return;
      await supabaseClient.from('pedidos').delete().eq('id',o.id);
      await loadOrders();
      showToast('Pedido eliminado','success');
    });

    c.appendChild(card);
  });
}

// ============ LOGOUT COCINERA ============
document.getElementById('logoutChefBtn').addEventListener('click',()=>{
  localStorage.removeItem('foodreserve_session');
  showView('viewLogin');
});

// ============ INICIO AUTOMÁTICO ============
const savedSession=localStorage.getItem('foodreserve_session');
if(savedSession){
  const u=JSON.parse(savedSession);
  if(u.role==='cocinera') openChef();
  else openUser();
}else{
  showView('viewLogin');
}

// ============ AUTO-REFRESCO: PEDIDOS (COCINERA) ============
setInterval(async ()=>{
  if(document.getElementById('viewCocinera').classList.contains('hidden')) return;
  await loadOrders();
},5000);

// ============ AUTO-REFRESCO: MENÚ (USUARIO) ============
setInterval(async ()=>{
  if(document.getElementById('viewUsuario').classList.contains('hidden')) return;
  const before=JSON.stringify(menu);
  await loadMenu();
  if(JSON.stringify(menu)!==before) renderMenuUser();
},10000);