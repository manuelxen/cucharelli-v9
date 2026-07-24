import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, onSnapshot, 
  query, orderBy, doc, updateDoc, deleteDoc, serverTimestamp, increment, writeBatch, getDocs 
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  Package, ShoppingCart, TrendingUp, DollarSign, 
  Settings, PlusCircle, Trash2, Save, Activity, LayoutGrid,
  Image as ImageIcon, Plus, X, Pencil, RotateCcw,
  ArrowRightLeft, FileDown, MapPin, AlertTriangle, ArrowRight, ArrowLeft, Tag, GlassWater, CakeSlice,
  Home, StickyNote
} from 'lucide-react';

// --- CONFIGURACIÓN DE FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyDpYFlx8gAiV1peCmT2XjHxhkfwi9YQUu8",
  authDomain: "cuchareli.firebaseapp.com",
  projectId: "cuchareli",
  storageBucket: "cuchareli.firebasestorage.app",
  messagingSenderId: "1085898940488",
  appId: "1:1085898940488:web:1e1b23dda539237a13f87d",
  measurementId: "G-Q1YTR3RBH1"
};

// --- ESTILO Y MARCA ---
const BRAND = {
  brown: 'bg-[#5D4037]',
  brownText: 'text-[#3E2723]',
  pink: 'text-[#E91E63]',
  pinkBg: 'bg-[#E91E63]',
  cream: 'bg-[#F9F7F2]',
  creamDark: 'bg-[#F0EBE0]',
  purple: 'text-[#9C27B0]', 
  purpleBg: 'bg-[#9C27B0]'
};

export default function CucharelliApp() {
  // --- ESTADOS ---
  const [activeTab, setActiveTab] = useState('stock');
  const [products, setProducts] = useState([]);
  const [drinks, setDrinks] = useState([]); 
  const [transactions, setTransactions] = useState([]);
  const [eventsList, setEventsList] = useState([]); 
  
  // Firebase
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [appId] = useState('cucharelli-v2');
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [user, setUser] = useState(null);

  // Estados de Interfaz Global
  const [companyName, setCompanyName] = useState('Cucharelli');
  const [activeEventId, setActiveEventId] = useState(''); 
  const [reportFilter, setReportFilter] = useState('month'); 

  // Produccion y Stock
  const [stockViewMode, setStockViewMode] = useState('main'); 
  const [transferDirection, setTransferDirection] = useState('to_daniela');
  const [stockInputs, setStockInputs] = useState({});
  const [transferInputs, setTransferInputs] = useState({});

  // Formularios Ajustes
  const [tempEventName, setTempEventName] = useState('');
  const [newProdName, setNewProdName] = useState('');
  const [newProdImage, setNewProdImage] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [newDrinkName, setNewDrinkName] = useState('');
  const [editingDrinkId, setEditingDrinkId] = useState(null);

  // Ventas
  const [saleLocation, setSaleLocation] = useState('main'); 
  const [saleNote, setSaleNote] = useState(''); 
  const [saleRows, setSaleRows] = useState([{ id: Date.now(), itemType: '', itemId: '', qty: 1, price: '' }]);

  // Gastos
  const [expenseRows, setExpenseRows] = useState([{ id: Date.now(), category: 'dessert', desc: '', amount: '' }]);

  // Edición de Reportes
  const [editingTransId, setEditingTransId] = useState(null);
  const [editTransAmount, setEditTransAmount] = useState('');
  const [editTransDesc, setEditTransDesc] = useState('');

  // --- LOGICA FIREBASE E INICIO ---
  useEffect(() => {
    const savedName = localStorage.getItem('cucharelli_company_name');
    if (savedName) setCompanyName(savedName);
    
    // Recuperar evento activo
    const savedEventId = localStorage.getItem('cucharelli_active_event_id');
    if (savedEventId) {
      setActiveEventId(savedEventId);
      setReportFilter(savedEventId);
    }

    initFirebase(firebaseConfig);
  }, []);

  const initFirebase = async (config) => {
    try {
      let app;
      try { app = initializeApp(config); } catch(e) { return; }
      const authInstance = getAuth(app);
      const dbInstance = getFirestore(app);
      setAuth(authInstance);
      setDb(dbInstance);
      try { await signInAnonymously(authInstance); } catch (e) {}
      onAuthStateChanged(authInstance, (u) => { if (u) { setUser(u); setIsFirebaseReady(true); } });
    } catch (error) { console.error("Error Firebase:", error); }
  };

  useEffect(() => {
    if (!isFirebaseReady || !db || !user) return;
    
    const qProd = query(collection(db, 'artifacts', appId, 'public', 'data', 'products'), orderBy('name'));
    const unsubProd = onSnapshot(qProd, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), stock: doc.data().stock || 0, stockDaniela: doc.data().stockDaniela || 0})));
    });

    const qDrinks = query(collection(db, 'artifacts', appId, 'public', 'data', 'drinks'), orderBy('name'));
    const unsubDrinks = onSnapshot(qDrinks, (snapshot) => {
      setDrinks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qTrans = query(collection(db, 'artifacts', appId, 'public', 'data', 'transactions'), orderBy('createdAt', 'desc'));
    const unsubTrans = onSnapshot(qTrans, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate() || new Date() })));
    });

    const qEvents = query(collection(db, 'artifacts', appId, 'public', 'data', 'events'), orderBy('createdAt', 'desc'));
    const unsubEvents = onSnapshot(qEvents, (snapshot) => {
      setEventsList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubProd(); unsubDrinks(); unsubTrans(); unsubEvents(); };
  }, [isFirebaseReady, db, user, appId]);

  const toggleActiveEvent = (id) => {
    if (activeEventId === id) {
      // Apagar
      setActiveEventId('');
      localStorage.removeItem('cucharelli_active_event_id');
      setReportFilter('month');
      alert("Turno/Feria Finalizado. Volviendo al modo normal.");
    } else {
      // Encender
      setActiveEventId(id);
      localStorage.setItem('cucharelli_active_event_id', id);
      setReportFilter(id);
      const ev = eventsList.find(e => e.id === id);
      alert(`¡Modo Feria Activo: ${ev?.name}!\n\nTodas las ventas se registrarán aquí.`);
    }
  };

  const createEvent = async () => {
    if (!tempEventName) return alert("Escribe un nombre");
    if (isFirebaseReady && db) {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'events'), { name: tempEventName, createdAt: serverTimestamp() });
      setTempEventName(''); alert("Feria creada");
    }
  };

  const deleteEvent = async (id) => {
    if(!window.confirm("¿Borrar esta feria de la lista?")) return;
    if (isFirebaseReady && db) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'events', id));
      if(activeEventId === id) {
         setActiveEventId('');
         localStorage.removeItem('cucharelli_active_event_id');
      }
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setNewProdImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProduct = async () => {
    if (!newProdName) return alert("Falta el nombre del postre");
    if (editingId) {
      if (isFirebaseReady && db) {
        // Enviar null si se borró la foto, o la foto nueva si se subió
        const updateData = { name: newProdName, photo: newProdImage || null };
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', editingId), updateData);
      }
      alert("¡Postre actualizado!");
    } else {
      if (isFirebaseReady && db) {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'products'), { 
          name: newProdName, photo: newProdImage || null, stock: 0, stockDaniela: 0 
        });
      }
      alert("Postre agregado exitosamente");
    }
    setNewProdName(''); setNewProdImage(null); setEditingId(null);
  };

  const handleSaveDrink = async () => {
    if (!newDrinkName) return alert("Falta el nombre");
    if (editingDrinkId) {
      if (isFirebaseReady && db) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'drinks', editingDrinkId), { name: newDrinkName });
    } else {
      if (isFirebaseReady && db) await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'drinks'), { name: newDrinkName });
    }
    setNewDrinkName(''); setEditingDrinkId(null); alert("Bebida guardada");
  };

  const handleDeleteItem = async (collectionName, id) => {
    if (!window.confirm("¿Seguro que deseas eliminar esto?")) return;
    if (isFirebaseReady && db) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', collectionName, id));
    }
  };

  const updateStockBulk = async () => {
    const updates = Object.entries(stockInputs).filter(([_, qty]) => parseInt(qty) > 0);
    if (updates.length === 0) return;
    if (isFirebaseReady && db) {
      const batch = writeBatch(db);
      updates.forEach(([id, qty]) => {
        batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'products', id), { stock: increment(parseInt(qty)) });
      });
      batch.set(doc(collection(db, 'artifacts', appId, 'public', 'data', 'transactions')), {
        type: 'restock', itemCategory: 'dessert', location: 'main', 
        items: updates.map(([id, qty]) => ({ name: products.find(x => x.id === id)?.name, qty: parseInt(qty) })), 
        createdAt: serverTimestamp(), eventId: activeEventId || null
      });
      await batch.commit();
    }
    setStockInputs({}); alert("Producción registrada");
  };

  const handleTransfer = async () => {
    const updates = Object.entries(transferInputs).filter(([_, qty]) => parseInt(qty) > 0);
    if (updates.length === 0) return;
    for (let [id, qty] of updates) {
      const prod = products.find(p => p.id === id);
      if (transferDirection === 'to_daniela' && prod.stock < parseInt(qty)) return alert(`Falta stock de ${prod.name} en Vitrina.`);
      if (transferDirection === 'from_daniela' && prod.stockDaniela < parseInt(qty)) return alert(`Falta stock de ${prod.name} en Casa Daniela.`);
    }
    if (isFirebaseReady && db) {
      const batch = writeBatch(db);
      updates.forEach(([id, qty]) => {
        const ref = doc(db, 'artifacts', appId, 'public', 'data', 'products', id);
        if (transferDirection === 'to_daniela') batch.update(ref, { stock: increment(-parseInt(qty)), stockDaniela: increment(parseInt(qty)) });
        else batch.update(ref, { stock: increment(parseInt(qty)), stockDaniela: increment(-parseInt(qty)) });
      });
      const desc = transferDirection === 'to_daniela' ? 'Envío a Daniela' : 'Retorno de Daniela';
      batch.set(doc(collection(db, 'artifacts', appId, 'public', 'data', 'transactions')), {
        type: 'transfer', itemCategory: 'dessert', description: desc, amount: 0, 
        items: updates.map(([id, qty]) => ({ name: products.find(x => x.id === id)?.name, qty: parseInt(qty) })), 
        createdAt: serverTimestamp(), eventId: activeEventId || null
      });
      await batch.commit();
    }
    setTransferInputs({}); alert("Transferencia exitosa");
  };

  const addSaleRow = () => setSaleRows([...saleRows, { id: Date.now(), itemType: '', itemId: '', qty: 1, price: '' }]);
  const removeSaleRow = (id) => setSaleRows(saleRows.filter(row => row.id !== id));
  
  const handleDropdownChange = (id, value) => {
    if(!value) {
      setSaleRows(saleRows.map(r => r.id === id ? { ...r, itemType: '', itemId: '' } : r));
      return;
    }
    const [type, itemId] = value.split('_'); 
    setSaleRows(saleRows.map(r => r.id === id ? { ...r, itemType: type, itemId: itemId } : r));
  };

  const updateSaleRow = (id, field, value) => setSaleRows(saleRows.map(row => row.id === id ? { ...row, [field]: value } : row));
  
  const totalSaleAmount = saleRows.reduce((acc, row) => acc + (parseFloat(row.price || 0)), 0);

  const registerMultiSale = async () => {
    const validRows = saleRows.filter(r => r.itemId && r.qty > 0 && r.price);
    if (validRows.length === 0) return alert("Añade productos o tragos válidos");

    const dessertRows = validRows.filter(r => r.itemType === 'dessert');
    const drinkRows = validRows.filter(r => r.itemType === 'drink');

    // Verificar Stock Postres
    for (let row of dessertRows) {
      const prod = products.find(p => p.id === row.itemId);
      const stockAvailable = saleLocation === 'main' ? prod.stock : prod.stockDaniela;
      if (!prod || stockAvailable < row.qty) {
        return alert(`¡Stock insuficiente de ${prod?.name} en ${saleLocation === 'main' ? 'Vitrina' : 'Casa Daniela'}!`);
      }
    }

    if (isFirebaseReady && db) {
      const batch = writeBatch(db);
      
      // Descontar Stock Postres
      dessertRows.forEach(row => {
        const ref = doc(db, 'artifacts', appId, 'public', 'data', 'products', row.itemId);
        if (saleLocation === 'main') batch.update(ref, { stock: increment(-parseInt(row.qty)) });
        else batch.update(ref, { stockDaniela: increment(-parseInt(row.qty)) });
      });
      
      if (dessertRows.length > 0) {
        const sumDesserts = dessertRows.reduce((acc, row) => acc + parseFloat(row.price), 0);
        batch.set(doc(collection(db, 'artifacts', appId, 'public', 'data', 'transactions')), {
          type: 'sale', itemCategory: 'dessert', location: saleLocation, amount: sumDesserts,
          description: saleNote || (saleLocation === 'main' ? 'Venta Postres (Vitrina)' : 'Venta Postres (Daniela)'), 
          items: dessertRows.map(row => ({ name: products.find(p => p.id === row.itemId)?.name, qty: parseInt(row.qty), lineTotal: parseFloat(row.price) })),
          createdAt: serverTimestamp(), eventId: activeEventId || null 
        });
      }

      if (drinkRows.length > 0) {
        const sumDrinks = drinkRows.reduce((acc, row) => acc + parseFloat(row.price), 0);
        batch.set(doc(collection(db, 'artifacts', appId, 'public', 'data', 'transactions')), {
          type: 'sale', itemCategory: 'drink', location: 'bar', amount: sumDrinks,
          description: saleNote || 'Venta de Tragos', 
          items: drinkRows.map(row => ({ name: drinks.find(d => d.id === row.itemId)?.name, qty: parseInt(row.qty), lineTotal: parseFloat(row.price) })),
          createdAt: serverTimestamp(), eventId: activeEventId || null 
        });
      }

      await batch.commit();
    }
    
    setSaleRows([{ id: Date.now(), itemType: '', itemId: '', qty: 1, price: '' }]);
    setSaleNote(''); 
    alert("¡Venta Registrada!");
  };

  const addExpenseRow = () => setExpenseRows([...expenseRows, { id: Date.now(), category: 'dessert', desc: '', amount: '' }]);
  const registerMultiExpense = async () => {
    const validRows = expenseRows.filter(r => r.desc && r.amount);
    if (validRows.length === 0) return alert("Datos incompletos");
    
    if (isFirebaseReady && db) {
      const batch = writeBatch(db);
      
      const dessertExp = validRows.filter(r => r.category === 'dessert');
      const drinkExp = validRows.filter(r => r.category === 'drink');

      if(dessertExp.length > 0) {
        batch.set(doc(collection(db, 'artifacts', appId, 'public', 'data', 'transactions')), {
          type: 'expense', itemCategory: 'dessert', amount: dessertExp.reduce((a, r) => a + parseFloat(r.amount), 0), 
          items: dessertExp.map(r => ({ desc: r.desc, price: parseFloat(r.amount) })), 
          createdAt: serverTimestamp(), eventId: activeEventId || null
        });
      }

      if(drinkExp.length > 0) {
        batch.set(doc(collection(db, 'artifacts', appId, 'public', 'data', 'transactions')), {
          type: 'expense', itemCategory: 'drink', amount: drinkExp.reduce((a, r) => a + parseFloat(r.amount), 0), 
          items: drinkExp.map(r => ({ desc: r.desc, price: parseFloat(r.amount) })), 
          createdAt: serverTimestamp(), eventId: activeEventId || null
        });
      }

      await batch.commit();
    }
    setExpenseRows([{ id: Date.now(), category: 'dessert', desc: '', amount: '' }]); 
    alert("Gasto registrado");
  };

  const saveTransactionEdit = async () => {
    if (!editingTransId) return;
    if (isFirebaseReady && db) {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'transactions', editingTransId), { 
        amount: parseFloat(editTransAmount), ...(editTransDesc ? { description: editTransDesc } : {})
      });
      alert("Corregido"); setEditingTransId(null);
    }
  };

  const deleteTransaction = async (id) => {
    if (window.confirm("¿Borrar movimiento?")) if (isFirebaseReady && db) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'transactions', id));
  };

  const clearAllHistory = async () => {
    if (!window.confirm("⚠️ ¿ESTÁS SEGURO? Se borrarán las finanzas.")) return;
    if (isFirebaseReady && db) {
      const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'transactions'));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      alert("Historial borrado.");
    }
  };

  const filteredTransactions = useMemo(() => {
    if (reportFilter === 'all') return transactions;
    if (eventsList.some(e => e.id === reportFilter)) return transactions.filter(t => t.eventId === reportFilter);
    const now = new Date();
    return transactions.filter(t => t.createdAt.getMonth() === now.getMonth() && t.createdAt.getFullYear() === now.getFullYear());
  }, [transactions, reportFilter, eventsList]);

  const calcTotals = (category) => {
    const tr = category === 'all' ? filteredTransactions : filteredTransactions.filter(t => t.itemCategory === category);
    const sales = tr.filter(t => t.type === 'sale').reduce((acc, t) => acc + (t.amount || 0), 0);
    const expenses = tr.filter(t => t.type === 'expense').reduce((acc, t) => acc + (t.amount || 0), 0);
    return { sales, expenses, net: sales - expenses };
  };

  const totalsAll = calcTotals('all');
  const totalsDesserts = calcTotals('dessert');
  const totalsDrinks = calcTotals('drink');

  const totalStockMain = products.reduce((acc, p) => acc + (p.stock || 0), 0);
  const totalStockDaniela = products.reduce((acc, p) => acc + (p.stockDaniela || 0), 0);

  const Header = ({ title }) => (
    <div className={`${BRAND.brown} p-4 text-white shadow-md sticky top-0 z-10 flex justify-between items-center`}>
      <div className="flex flex-col">
        <h1 className="text-xl font-bold tracking-wider font-serif">{companyName}</h1>
        <span className="text-[10px] text-pink-200 tracking-widest uppercase">By Araceli Palomino</span>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className={`${BRAND.pinkBg} text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm`}>{title}</span>
      </div>
    </div>
  );

  const NavButton = ({ id, icon: Icon, label }) => (
    <button onClick={() => setActiveTab(id)} className={`flex flex-col items-center justify-center w-full py-2 transition-colors ${activeTab === id ? `${BRAND.pink}` : 'text-gray-400'}`}>
      <Icon size={24} strokeWidth={activeTab === id ? 2.5 : 2} /> <span className="text-[10px] font-medium mt-1">{label}</span>
    </button>
  );

  const renderContent = () => {
    switch(activeTab) {
      case 'stock':
        return (
          <div className="p-4 space-y-4 pb-20">
            {activeEventId && (
              <div className="bg-yellow-100 border border-yellow-300 p-3 rounded-xl flex items-center justify-between shadow-sm animate-pulse">
                <div className="flex flex-col">
                  <span className="text-[10px] text-yellow-600 font-bold uppercase tracking-wider">Turno Feria</span>
                  <span className="font-bold text-yellow-900 text-sm">🔥 {eventsList.find(e => e.id === activeEventId)?.name}</span>
                </div>
                <button onClick={() => toggleActiveEvent(activeEventId)} className="bg-white text-yellow-800 border border-yellow-300 px-3 py-1 rounded-lg text-xs font-bold shadow-sm">Cerrar</button>
              </div>
            )}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-[#EFEBE9] grid grid-cols-3 gap-2 text-center">
              <div className="border-r border-gray-100"><p className="text-[10px] text-gray-400 uppercase font-bold">Total</p><p className={`text-2xl font-bold ${BRAND.brownText}`}>{totalStockMain + totalStockDaniela}</p></div>
              <div className="border-r border-gray-100"><p className="text-[10px] text-gray-400 uppercase font-bold">Vitrina</p><p className="text-xl font-bold text-[#5D4037]">{totalStockMain}</p></div>
              <div><p className="text-[10px] text-gray-400 uppercase font-bold">Daniela</p><p className="text-xl font-bold text-[#E91E63]">{totalStockDaniela}</p></div>
            </div>
            <div className="flex justify-between items-center mb-2">
              <h2 className={`text-xl font-bold ${BRAND.brownText} flex items-center gap-2`}><Package className="text-[#E91E63]" /> {stockViewMode === 'main' ? 'Vitrina' : 'Casa Daniela'}</h2>
              <div className="bg-gray-100 p-1 rounded-lg flex text-xs font-bold">
                <button onClick={() => setStockViewMode('main')} className={`px-3 py-1 rounded-md transition-all ${stockViewMode === 'main' ? 'bg-white shadow text-[#5D4037]' : 'text-gray-400'}`}>Vitrina</button>
                <button onClick={() => setStockViewMode('daniela')} className={`px-3 py-1 rounded-md transition-all ${stockViewMode === 'daniela' ? 'bg-white shadow text-[#E91E63]' : 'text-gray-400'}`}>Daniela</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {products.map(p => {
                const currentStock = stockViewMode === 'main' ? p.stock : p.stockDaniela;
                return (
                  <div key={p.id} className="bg-white rounded-xl shadow-sm border border-[#EFEBE9] overflow-hidden flex flex-col group">
                    <div className="h-32 w-full relative bg-gray-100 flex items-center justify-center">
                      {p.photo ? <img src={p.photo} alt={p.name} className="w-full h-full object-cover" /> : <Package className="text-gray-300" size={40} />}
                      <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-bold shadow ${stockViewMode === 'main' ? 'bg-white text-[#5D4037]' : 'bg-[#E91E63] text-white'}`}>x{currentStock}</div>
                    </div>
                    <div className="p-3 text-center bg-white"><h3 className="font-bold text-[#5D4037] text-sm leading-tight">{p.name}</h3><p className={`text-xs mt-1 font-medium ${currentStock < 5 ? 'text-red-500' : 'text-green-600'}`}>{currentStock === 0 ? 'AGOTADO' : 'Disponible'}</p></div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'add_stock':
        return (
          <div className="p-4 pb-24 space-y-8">
            <div>
              <h2 className={`text-xl font-bold ${BRAND.brownText} mb-2 flex items-center gap-2`}><PlusCircle className="text-[#E91E63]" /> Producción (Postres)</h2>
              <div className="space-y-3">
                {products.map(p => (
                  <div key={p.id} className="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm border border-[#EFEBE9]">
                    <span className={`font-bold ${BRAND.brownText} truncate text-sm w-1/2`}>{p.name}</span>
                    <input type="number" placeholder="0" className="w-12 bg-[#F9F7F2] rounded p-1 text-center font-bold text-[#E91E63] outline-none" value={stockInputs[p.id] || ''} onChange={(e) => setStockInputs({...stockInputs, [p.id]: e.target.value})} />
                  </div>
                ))}
              </div>
              <button onClick={updateStockBulk} className={`mt-4 ${BRAND.brown} text-white w-full py-3 rounded-xl font-bold shadow-lg flex justify-center gap-2`}><Save size={20} /> GUARDAR</button>
            </div>

            <div className="bg-[#E3F2FD] p-5 rounded-2xl border border-blue-100">
              <div className="flex justify-between items-center mb-4">
                <h2 className={`text-lg font-bold text-blue-800 flex items-center gap-2`}><ArrowRightLeft size={18} /> Transferir Postres</h2>
                <button onClick={() => setTransferDirection(prev => prev === 'to_daniela' ? 'from_daniela' : 'to_daniela')} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg shadow-sm text-xs font-bold border border-blue-200">
                  {transferDirection === 'to_daniela' ? <><ArrowRight size={14} className="text-blue-500"/> A Daniela</> : <><ArrowLeft size={14} className="text-orange-500"/> Regresar</>}
                </button>
              </div>
              <div className="space-y-2">
                {products.map(p => (
                  <div key={p.id} className="flex items-center justify-between bg-white/50 p-2 rounded-lg border border-blue-100">
                     <span className="text-xs text-blue-900 font-medium truncate w-1/2">{p.name}</span>
                     <div className="flex items-center gap-2">
                       <span className="text-[10px] text-gray-400">{transferDirection === 'to_daniela' ? `Disp: ${p.stock}` : `En Dani: ${p.stockDaniela}`}</span>
                       <input type="number" placeholder="0" className="w-12 bg-white rounded p-1 text-center font-bold text-blue-600 outline-none" value={transferInputs[p.id] || ''} onChange={(e) => setTransferInputs({...transferInputs, [p.id]: e.target.value})} />
                     </div>
                  </div>
                ))}
              </div>
              <button onClick={handleTransfer} className={`mt-4 ${transferDirection === 'to_daniela' ? 'bg-blue-600' : 'bg-orange-500'} text-white w-full py-3 rounded-xl font-bold shadow-lg flex justify-center gap-2`}>
                {transferDirection === 'to_daniela' ? 'ENVIAR A DANI' : 'REGRESAR A VITRINA'}
              </button>
            </div>
          </div>
        );

      case 'sales':
        return (
          <div className="p-4 pb-24 max-w-lg mx-auto">
            {activeEventId && (
              <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-2 mb-4 text-xs font-bold shadow-sm">
                <span>🔥 Guardando en Feria Activa</span>
              </div>
            )}
            
            <div className="bg-gray-100 p-1 rounded-xl flex text-sm font-bold mb-4">
              <button onClick={() => setSaleLocation('main')} className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${saleLocation === 'main' ? 'bg-white shadow text-[#5D4037]' : 'text-gray-400'}`}><Package size={16}/> Mi Vitrina</button>
              <button onClick={() => setSaleLocation('daniela')} className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${saleLocation === 'daniela' ? 'bg-white shadow text-[#E91E63]' : 'text-gray-400'}`}><Home size={16}/> Casa Daniela</button>
            </div>

            <h2 className={`text-xl font-bold ${BRAND.brownText} mb-2 flex items-center gap-2`}><ShoppingCart className="text-[#E91E63]" /> Ticket de Venta</h2>
            
            <div className="space-y-3 mb-6">
              <div className="flex gap-2 text-xs font-bold text-[#8D6E63] px-1"><div className="flex-1">Producto / Trago</div><div className="w-14 text-center">Cant.</div><div className="w-20 text-right">Total (S/)</div></div>
              
              {saleRows.map((row) => (
                <div key={row.id} className="bg-white p-2 rounded-xl shadow-sm border border-[#EFEBE9] flex gap-2 items-start">
                  <div className="flex-1">
                     <select 
                       className={`w-full p-2 bg-[#F9F7F2] border border-[#E0E0E0] rounded-lg text-sm font-bold outline-none ${row.itemType === 'drink' ? BRAND.purple : BRAND.brownText}`} 
                       value={row.itemId ? `${row.itemType}_${row.itemId}` : ''} 
                       onChange={(e) => handleDropdownChange(row.id, e.target.value)}
                     >
                      <option value="">Buscar...</option>
                      <optgroup label="🍰 POSTRES">
                        {products.filter(p => (saleLocation === 'main' ? p.stock : p.stockDaniela) > 0).map(p => (
                          <option key={`dessert_${p.id}`} value={`dessert_${p.id}`}>{p.name}</option>
                        ))}
                      </optgroup>
                      <optgroup label="🍹 TRAGOS">
                        {drinks.map(d => (
                          <option key={`drink_${d.id}`} value={`drink_${d.id}`}>{d.name}</option>
                        ))}
                      </optgroup>
                    </select>
                    {row.itemType === 'dessert' && row.itemId && <div className="text-[9px] text-gray-400 ml-1 mt-1">Disp: {saleLocation === 'main' ? products.find(p => p.id === row.itemId)?.stock : products.find(p => p.id === row.itemId)?.stockDaniela}</div>}
                    {row.itemType === 'drink' && <div className="text-[9px] text-[#9C27B0] ml-1 mt-1">Barra</div>}
                  </div>
                  <div className="w-14"><input type="number" min="1" className={`w-full p-2 bg-[#F9F7F2] border border-[#E0E0E0] rounded-lg text-center font-bold ${BRAND.brownText}`} value={row.qty} onChange={(e) => updateSaleRow(row.id, 'qty', e.target.value)}/></div>
                  <div className="w-20"><input type="number" placeholder="0.0" className={`w-full p-2 bg-[#F9F7F2] border border-[#E0E0E0] rounded-lg text-right font-bold ${BRAND.brownText}`} value={row.price} onChange={(e) => updateSaleRow(row.id, 'price', e.target.value)}/></div>
                  {saleRows.length > 1 && <button onClick={() => removeSaleRow(row.id)} className="text-red-400 p-1 mt-1"><Trash2 size={18} /></button>}
                </div>
              ))}
              <button onClick={addSaleRow} className="w-full py-2 border-2 border-dashed border-[#D7CCC8] rounded-xl text-[#8D6E63] font-bold text-xs flex justify-center items-center gap-2 hover:bg-[#EFEBE9]"><Plus size={16} /> Añadir otra fila</button>
            </div>
            
            <div className="mb-20">
              <label className="text-xs font-bold text-[#8D6E63] mb-1 block">Nota / Cliente:</label>
              <div className="flex items-center gap-2 bg-white border border-[#E0E0E0] rounded-xl p-2"><StickyNote className="text-gray-400" size={18} /><input type="text" placeholder='Ej: "Mesa 4", "Sin hielo"' className="w-full bg-transparent text-sm outline-none text-[#5D4037]" value={saleNote} onChange={(e) => setSaleNote(e.target.value)} /></div>
            </div>
            
            <div className="fixed bottom-20 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-500 font-medium">Total a cobrar:</span>
                <span className={`text-3xl font-bold ${BRAND.brownText}`}>S/ {totalSaleAmount.toFixed(2)}</span>
              </div>
              <button onClick={registerMultiSale} className="w-full bg-[#4CAF50] text-white py-3 rounded-xl font-bold shadow-lg">COBRAR</button>
            </div>
          </div>
        );

      case 'expenses':
        return (
          <div className="p-4 pb-24">
             {activeEventId && (
              <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-2 mb-4 text-xs font-bold shadow-sm">🔥 Registrando en Feria Activa</div>
            )}
             <div className="flex justify-between items-center mb-4">
                <h2 className={`text-xl font-bold ${BRAND.brownText} flex items-center gap-2`}><TrendingUp className="text-red-500" /> Gastos</h2>
             </div>

            <div className="space-y-4 mb-20">
              {expenseRows.map((row) => (
                <div key={row.id} className={`bg-white p-3 rounded-xl shadow-sm border-l-4 flex flex-col gap-2 ${row.category === 'drink' ? 'border-l-[#9C27B0]' : 'border-l-red-400'}`}>
                  
                  <div className="flex justify-between items-center bg-gray-50 p-1 rounded-lg">
                    <select 
                      className={`text-xs font-bold outline-none bg-transparent ${row.category === 'drink' ? BRAND.purple : 'text-red-600'}`}
                      value={row.category} onChange={(e) => setExpenseRows(expenseRows.map(r => r.id === row.id ? {...r, category: e.target.value} : r))}
                    >
                      <option value="dessert">🍰 Gasto para Postres</option>
                      <option value="drink">🍹 Gasto para Tragos</option>
                    </select>
                    {expenseRows.length > 1 && <button onClick={() => setExpenseRows(expenseRows.filter(r => r.id !== row.id))} className="text-gray-400"><X size={16}/></button>}
                  </div>

                  <div className="flex gap-2 items-center">
                    <div className="flex-1"><input type="text" placeholder="Ej: Leche, Hielo..." className={`w-full p-2 bg-transparent border-b border-gray-100 text-sm font-medium outline-none ${BRAND.brownText}`} value={row.desc} onChange={(e) => setExpenseRows(expenseRows.map(r => r.id === row.id ? {...r, desc: e.target.value} : r))}/></div>
                    <div className="w-24"><input type="number" placeholder="S/ 0" className={`w-full p-2 rounded-lg text-right font-bold text-sm outline-none ${row.category === 'drink' ? 'bg-purple-50 text-purple-700' : 'bg-red-50 text-red-600'}`} value={row.amount} onChange={(e) => setExpenseRows(expenseRows.map(r => r.id === row.id ? {...r, amount: e.target.value} : r))}/></div>
                  </div>
                </div>
              ))}
              <button onClick={addExpenseRow} className="text-xs font-bold text-gray-500 underline p-2">+ Agregar otra fila</button>
            </div>
            <div className="fixed bottom-20 left-0 right-0 p-4"><button onClick={registerMultiExpense} className="w-full bg-red-500 text-white py-3 rounded-xl font-bold shadow-lg">GUARDAR GASTOS</button></div>
          </div>
        );

      case 'reports':
        return (
          <div className="p-4 pb-20">
            <div className="flex flex-col gap-2 mb-4">
              <h2 className={`text-xl font-bold ${BRAND.brownText} flex items-center gap-2`}><Activity className="text-[#E91E63]" /> Reportes</h2>
              <select value={reportFilter} onChange={(e) => setReportFilter(e.target.value)} className="bg-white border shadow-sm text-xs p-2 rounded-lg outline-none font-bold text-[#5D4037]">
                <option value="month">📊 Este Mes</option>
                <option value="all">📚 Histórico Completo</option>
                {eventsList.length > 0 && <optgroup label="🔥 Ferias">
                  {eventsList.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                </optgroup>}
              </select>
            </div>

            <div className={`${BRAND.brown} text-white p-5 rounded-2xl shadow-lg mb-4 relative overflow-hidden`}>
               <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-[#E91E63] rounded-full opacity-20 blur-xl"></div>
               <p className="text-orange-100 text-xs mb-1">GANANCIA NETA TOTAL</p>
               <h3 className="text-3xl font-bold">S/ {totalsAll.net.toFixed(2)}</h3>
               <div className="flex gap-4 mt-3 pt-3 border-t border-white/10">
                 <div><p className="text-[9px] text-green-300 uppercase">Ingresos</p><p className="font-bold text-sm">S/ {totalsAll.sales.toFixed(2)}</p></div>
                 <div><p className="text-[9px] text-red-300 uppercase">Egresos</p><p className="font-bold text-sm">S/ {totalsAll.expenses.toFixed(2)}</p></div>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-white border border-pink-100 p-3 rounded-xl shadow-sm">
                <p className="text-[10px] text-pink-600 font-bold uppercase flex items-center gap-1"><CakeSlice size={12}/> Postres</p>
                <p className="text-xl font-bold text-gray-800">S/ {totalsDesserts.net.toFixed(2)}</p>
              </div>
              <div className="bg-white border border-purple-100 p-3 rounded-xl shadow-sm">
                <p className="text-[10px] text-[#9C27B0] font-bold uppercase flex items-center gap-1"><GlassWater size={12}/> Tragos</p>
                <p className="text-xl font-bold text-gray-800">S/ {totalsDrinks.net.toFixed(2)}</p>
              </div>
            </div>
            
            <h3 className="font-bold text-[#8D6E63] mb-3 text-sm uppercase">Movimientos</h3>
            <div className="space-y-3">
              {filteredTransactions.map(t => (
                <div key={t.id} className={`bg-white p-3 rounded-xl shadow-sm border ${editingTransId === t.id ? 'border-blue-400 bg-blue-50' : (t.itemCategory === 'drink' ? 'border-purple-100' : 'border-[#EFEBE9]')}`}>
                  {editingTransId === t.id ? (
                    <div className="flex flex-col gap-2">
                      <input type="number" className="p-2 border rounded bg-white font-bold" value={editTransAmount} onChange={(e) => setEditTransAmount(e.target.value)} />
                      <input type="text" className="p-2 border rounded bg-white text-xs" value={editTransDesc} onChange={(e) => setEditTransDesc(e.target.value)} />
                      <div className="flex gap-2 justify-end mt-1"><button onClick={() => setEditingTransId(null)} className="text-gray-500 text-xs p-1">Cancelar</button><button onClick={saveTransactionEdit} className="bg-blue-600 text-white text-xs px-3 py-1 rounded font-bold">Guardar</button></div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${t.type === 'sale' ? 'bg-green-500' : t.type === 'expense' ? 'bg-red-500' : 'bg-gray-500'}`}></div>
                          <span className={`font-bold ${BRAND.brownText} text-sm flex items-center gap-1`}>
                            {t.itemCategory === 'drink' ? <GlassWater size={12} className="text-[#9C27B0]"/> : <CakeSlice size={12} className="text-[#E91E63]"/>}
                            {t.type === 'sale' ? 'Venta' : t.type === 'expense' ? 'Gasto' : 'Traslado/Prod'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-400">{t.createdAt.toLocaleDateString()}</span>
                          <button onClick={() => {setEditingTransId(t.id); setEditTransAmount(t.amount); setEditTransDesc(t.description || t.items?.[0]?.name);}} className="text-blue-400"><Pencil size={14}/></button>
                          <button onClick={() => deleteTransaction(t.id)} className="text-red-300"><Trash2 size={14}/></button>
                        </div>
                      </div>
                      <p className="text-xs font-medium text-gray-600 mb-1">{t.description}</p>
                      {t.items && <div className="bg-[#F9F7F2] rounded p-2 text-xs text-[#5D4037] space-y-1 mb-2">{t.items.map((item, idx) => (<div key={idx} className="flex justify-between"><span>{item.qty ? `${item.qty}x ` : ''}{item.name || item.desc}</span>{item.lineTotal && <span>S/ {item.lineTotal.toFixed(2)}</span>}</div>))}</div>}
                      <div className="text-right">{t.amount !== 0 && <span className={`font-bold ${t.type === 'sale' ? 'text-green-600' : 'text-red-500'}`}>{t.type === 'expense' ? '-' : '+'} S/ {parseFloat(t.amount).toFixed(2)}</span>}</div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="p-4 space-y-6 pb-20">
            <h2 className={`text-xl font-bold ${BRAND.brownText} flex items-center gap-2`}><Settings className="text-gray-400" /> Ajustes Generales</h2>
            
            {/* FERIAS */}
            <div className="bg-yellow-50 p-5 rounded-2xl border border-yellow-200">
              <h3 className="font-bold text-yellow-800 mb-2 flex items-center gap-2"><MapPin size={18}/> Ferias y Eventos</h3>
              <div className="flex gap-2 mb-3">
                <input className="flex-1 p-2 rounded-lg border text-sm outline-none" placeholder="Nueva Feria..." value={tempEventName} onChange={(e) => setTempEventName(e.target.value)} />
                <button onClick={createEvent} className="bg-yellow-500 text-white px-4 py-2 rounded-lg font-bold text-sm shadow">Crear</button>
              </div>
              <div className="space-y-2 border-t border-yellow-200 pt-3">
                {eventsList.map(ev => (
                  <div key={ev.id} className={`flex justify-between items-center p-2 rounded-lg border ${activeEventId === ev.id ? 'bg-yellow-300 border-yellow-400 shadow-sm' : 'bg-white border-yellow-100'}`}>
                    <span className={`text-sm font-bold ${activeEventId === ev.id ? 'text-yellow-900' : 'text-yellow-800'}`}>{ev.name}</span>
                    <div className="flex gap-2">
                      <button onClick={() => toggleActiveEvent(ev.id)} className={`text-xs px-3 py-1 rounded font-bold ${activeEventId === ev.id ? 'bg-white text-yellow-800' : 'bg-yellow-100 text-yellow-700'}`}>
                        {activeEventId === ev.id ? 'Apagar Turno' : 'Activar Turno'}
                      </button>
                      <button onClick={() => deleteEvent(ev.id)} className="text-red-400 p-1"><Trash2 size={16}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* TRAGOS */}
            <div className="bg-purple-50 p-5 rounded-2xl border border-purple-200">
              <h3 className="font-bold text-[#9C27B0] mb-2 flex items-center gap-2"><GlassWater size={18}/> Tragos / Bebidas</h3>
              <div className="flex gap-2 mb-3">
                <input className="flex-1 p-2 rounded-lg border border-purple-200 text-sm outline-none" placeholder="Ej: Pisco Sour" value={newDrinkName} onChange={(e) => setNewDrinkName(e.target.value)} />
                <button onClick={handleSaveDrink} className="bg-[#9C27B0] text-white px-4 py-2 rounded-lg font-bold text-sm shadow">{editingDrinkId ? 'Guardar' : 'Añadir'}</button>
              </div>
              <div className="space-y-2">
                {drinks.map(d => (
                  <div key={d.id} className="flex justify-between items-center bg-white p-2 rounded-lg border border-purple-100">
                    <span className="text-sm font-bold text-purple-900">{d.name}</span>
                    <div className="flex gap-2">
                      <button onClick={() => {setEditingDrinkId(d.id); setNewDrinkName(d.name);}} className="text-blue-400"><Pencil size={14}/></button>
                      <button onClick={() => handleDeleteItem('drinks', d.id)} className="text-red-400"><Trash2 size={14}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* POSTRES */}
            <div className={`p-5 rounded-2xl shadow-sm border transition-colors ${editingId ? 'bg-orange-50 border-orange-200' : 'bg-white border-[#EFEBE9]'}`}>
              <h3 className={`font-bold ${editingId ? 'text-orange-700' : BRAND.brownText} mb-2 flex items-center gap-2 justify-between`}>
                <span className="flex items-center gap-2"><CakeSlice size={18} className={editingId ? 'text-orange-500' : 'text-[#E91E63]'}/> {editingId ? 'Editando Postre' : 'Nuevo Postre'}</span>
                {editingId && <button onClick={() => {setEditingId(null); setNewProdName(''); setNewProdImage(null);}} className="text-xs bg-white px-2 py-1 rounded border shadow-sm flex items-center gap-1"><RotateCcw size={12}/> Cancelar</button>}
              </h3>
              <div className="space-y-3">
                <input className="w-full p-3 bg-white border border-[#E0E0E0] rounded-xl text-sm outline-none focus:border-[#E91E63]" placeholder="Nombre del Postre" value={newProdName} onChange={(e) => setNewProdName(e.target.value)}/>
                <div className="relative">
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"/>
                  <div className={`w-full p-3 border-2 border-dashed rounded-xl flex items-center justify-center gap-2 text-sm ${newProdImage ? 'border-[#E91E63] bg-pink-50 text-[#E91E63]' : 'border-gray-300 text-gray-400'}`}>
                    {newProdImage ? <><ImageIcon size={16} /> ¡Foto Lista!</> : <><Plus size={16} /> Subir Foto</>}
                  </div>
                </div>
                {/* LA CRUZ ROJA PARA ELIMINAR FOTO */}
                {newProdImage && (
                  <div className="relative w-20 h-20 mx-auto">
                    <div className="w-full h-full rounded-lg overflow-hidden border border-gray-200">
                      <img src={newProdImage} className="w-full h-full object-cover" />
                    </div>
                    <button onClick={() => setNewProdImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600 z-20">
                      <X size={12}/>
                    </button>
                  </div>
                )}
                <button onClick={handleSaveProduct} className={`${editingId ? 'bg-orange-600' : BRAND.brown} text-white w-full py-3 rounded-xl font-bold text-sm shadow transition`}>{editingId ? 'Actualizar Postre' : 'Guardar Postre'}</button>
              </div>
              <div className="space-y-2 border-t pt-4 mt-4">
                {products.map(p => (
                  <div key={p.id} className="flex items-center justify-between bg-[#F9F7F2] p-2 rounded-xl border border-gray-100">
                    <p className={`font-bold ${BRAND.brownText} truncate text-sm ml-2`}>{p.name}</p>
                    <div className="flex items-center gap-1">
                      {/* BOTON EDITAR MEJORADO */}
                      <button onClick={() => {setEditingId(p.id); setNewProdName(p.name); setNewProdImage(p.photo || null); window.scrollTo({top:0,behavior:'smooth'});}} className="p-2 text-blue-500"><Pencil size={16}/></button>
                      <button onClick={() => handleDeleteItem('products', p.id)} className="p-2 text-red-500"><Trash2 size={16}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* PELIGRO */}
            <div className="bg-red-50 p-5 rounded-2xl border border-red-200 mt-8">
              <h3 className="font-bold text-red-800 mb-2 flex items-center gap-2"><AlertTriangle size={18}/> Zona de Peligro</h3>
              <button onClick={clearAllHistory} className="w-full bg-red-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-red-700 active:scale-95 transition-all text-sm flex justify-center gap-2">
                <Trash2 size={16}/> BORRAR TODO EL HISTORIAL
              </button>
            </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className={`min-h-screen ${BRAND.cream} flex flex-col font-sans max-w-lg mx-auto shadow-2xl overflow-hidden relative`}>
      <Header title={activeTab === 'stock' ? 'Vitrina' : activeTab === 'add_stock' ? 'Cocina' : activeTab === 'sales' ? 'Caja' : activeTab === 'expenses' ? 'Finanzas' : activeTab === 'reports' ? 'Balance' : 'Admin'} />
      <main className="flex-1 overflow-y-auto">{renderContent()}</main>
      <nav className="bg-white border-t border-[#EFEBE9] flex justify-around items-center pb-safe pt-2 sticky bottom-0 z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <NavButton id="stock" icon={LayoutGrid} label="Stock" />
        <NavButton id="add_stock" icon={PlusCircle} label="Aumentar" />
        <NavButton id="sales" icon={DollarSign} label="Vender" />
        <NavButton id="expenses" icon={TrendingUp} label="Gastos" />
        <NavButton id="reports" icon={Activity} label="Reportes" />
        <NavButton id="settings" icon={Settings} label="Ajustes" />
      </nav>
    </div>
  );
}