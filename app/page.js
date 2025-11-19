'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, Download, Send, Eye, BarChart3, TrendingUp, Users, DollarSign, Loader2 } from 'lucide-react';

export default function CustomerPaymentApp() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ 
    name: '', 
    contractMonths: '', 
    monthlyPrice: '' 
  });
  const [receiptData, setReceiptData] = useState(null);

  // Load customers from API
  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/customers');
      const data = await response.json();
      setCustomers(data);
    } catch (error) {
      console.error('Error loading customers:', error);
      alert('Gagal memuat data pelanggan');
    } finally {
      setLoading(false);
    }
  };

  // Generate months array
  const getMonthsArray = (startDate, months) => {
    const months_array = [];
    const start = new Date(startDate);
    for (let i = 0; i < months; i++) {
      const date = new Date(start);
      date.setMonth(date.getMonth() + i);
      months_array.push({
        month: date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
        date: date.toISOString().split('T')[0],
      });
    }
    return months_array;
  };

  // Calculate stats
  const calculateStats = () => {
    const totalCustomers = customers.length;
    const totalRevenue = customers.reduce((sum, cust) => {
      const paid = cust.monthlyPayments.filter(p => p).length;
      return sum + (paid * cust.monthlyPrice);
    }, 0);
    
    const totalOutstanding = customers.reduce((sum, cust) => {
      const unpaid = cust.monthlyPayments.filter(p => !p).length;
      return sum + (unpaid * cust.monthlyPrice);
    }, 0);

    const totalPaymentsMade = customers.reduce((sum, cust) => {
      return sum + cust.monthlyPayments.filter(p => p).length;
    }, 0);

    return { totalCustomers, totalRevenue, totalOutstanding, totalPaymentsMade };
  };

  // Add customer
  const handleAddCustomer = async () => {
    if (!newCustomer.name || !newCustomer.contractMonths || !newCustomer.monthlyPrice) {
      alert('Semua field harus diisi!');
      return;
    }

    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCustomer.name,
          contractMonths: parseInt(newCustomer.contractMonths),
          startDate: today,
          monthlyPrice: parseInt(newCustomer.monthlyPrice),
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setNewCustomer({ name: '', contractMonths: '', monthlyPrice: '' });
        await loadCustomers();
        setCurrentPage('mainTable');
        alert('Pelanggan berhasil ditambahkan!');
      } else {
        alert('Gagal menambahkan pelanggan: ' + result.error);
      }
    } catch (error) {
      console.error('Error adding customer:', error);
      alert('Gagal menambahkan pelanggan');
    } finally {
      setSaving(false);
    }
  };

  // Toggle payment
  const handleTogglePayment = async (customerId, monthIndex) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    const updatedPayments = customer.monthlyPayments.map((paid, idx) =>
      idx === monthIndex ? !paid : paid
    );

    // Optimistic update
    setCustomers(customers.map(c =>
      c.id === customerId ? { ...c, monthlyPayments: updatedPayments } : c
    ));

    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthlyPayments: updatedPayments }),
      });

      const result = await response.json();
      
      if (!result.success) {
        // Revert on error
        alert('Gagal update pembayaran: ' + result.error);
        await loadCustomers();
      }
    } catch (error) {
      console.error('Error updating payment:', error);
      alert('Gagal update pembayaran');
      await loadCustomers();
    }
  };

  // Generate receipt
  const handleGenerateReceipt = (customer) => {
    const months = getMonthsArray(customer.startDate, customer.contractMonths);
    const paidMonths = months.filter((_, idx) => customer.monthlyPayments[idx]);
    const totalPaid = paidMonths.length * customer.monthlyPrice;

    setReceiptData({
      customer: customer.name,
      contractMonths: customer.contractMonths,
      paidMonths: paidMonths,
      monthlyPrice: customer.monthlyPrice,
      totalPaid: totalPaid,
      generatedDate: new Date().toLocaleDateString('id-ID'),
    });
    setCurrentPage('receipt');
  };

  const handleDownloadReceipt = () => {
    alert('Fitur download PDF siap dikembangkan lebih lanjut');
  };

  const handleSendWhatsApp = () => {
    alert('Fitur kirim ke WhatsApp siap dikembangkan lebih lanjut');
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* DASHBOARD */}
      {currentPage === 'dashboard' && (
        <div className="min-h-screen p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-gray-800 mb-2">Dashboard</h1>
              <p className="text-gray-600">Ringkasan manajemen pelanggan dan pembayaran</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-semibold mb-2">Total Pelanggan</p>
                    <p className="text-3xl font-bold text-gray-800">{stats.totalCustomers}</p>
                  </div>
                  <Users className="w-12 h-12 text-blue-500 opacity-20" />
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-semibold mb-2">Total Pendapatan</p>
                    <p className="text-3xl font-bold text-green-600">
                      Rp {(stats.totalRevenue / 1000000).toFixed(1)}M
                    </p>
                  </div>
                  <TrendingUp className="w-12 h-12 text-green-500 opacity-20" />
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-semibold mb-2">Piutang Belum Bayar</p>
                    <p className="text-3xl font-bold text-red-600">
                      Rp {(stats.totalOutstanding / 1000000).toFixed(1)}M
                    </p>
                  </div>
                  <DollarSign className="w-12 h-12 text-red-500 opacity-20" />
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-semibold mb-2">Cicilan Dibayar</p>
                    <p className="text-3xl font-bold text-indigo-600">{stats.totalPaymentsMade}</p>
                  </div>
                  <BarChart3 className="w-12 h-12 text-indigo-500 opacity-20" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Ringkasan Pelanggan</h2>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b-2 border-gray-300">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold text-gray-700">Nama Pelanggan</th>
                      <th className="px-6 py-3 text-center font-semibold text-gray-700">Harga/Bulan</th>
                      <th className="px-6 py-3 text-center font-semibold text-gray-700">Durasi</th>
                      <th className="px-6 py-3 text-center font-semibold text-gray-700">Sudah Bayar</th>
                      <th className="px-6 py-3 text-center font-semibold text-gray-700">Belum Bayar</th>
                      <th className="px-6 py-3 text-right font-semibold text-gray-700">Total Terhutang</th>
                      <th className="px-6 py-3 text-center font-semibold text-gray-700">Progres</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((customer) => {
                      const paid = customer.monthlyPayments.filter(p => p).length;
                      const unpaid = customer.contractMonths - paid;
                      const unpaidValue = unpaid * customer.monthlyPrice;
                      const progress = (paid / customer.contractMonths) * 100;

                      return (
                        <tr key={customer.id} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="px-6 py-4 font-medium text-gray-800">{customer.name}</td>
                          <td className="px-6 py-4 text-center text-gray-700">
                            Rp {customer.monthlyPrice.toLocaleString('id-ID')}
                          </td>
                          <td className="px-6 py-4 text-center text-gray-700">{customer.contractMonths} bulan</td>
                          <td className="px-6 py-4 text-center">
                            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                              {paid}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-semibold">
                              {unpaid}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right text-red-600 font-semibold">
                            Rp {unpaidValue.toLocaleString('id-ID')}
                          </td>
                          <td className="px-6 py-4">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-green-500 h-2 rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <p className="text-xs text-gray-600 text-center mt-1">{progress.toFixed(0)}%</p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setCurrentPage('mainTable')}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3 rounded-lg hover:shadow-lg transition"
              >
                Kelola Pembayaran
              </button>
              <button
                onClick={() => setCurrentPage('inputCustomer')}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3 rounded-lg hover:shadow-lg transition"
              >
                Tambah Pelanggan Baru
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INPUT PELANGGAN BARU */}
      {currentPage === 'inputCustomer' && (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
            <button
              onClick={() => setCurrentPage('dashboard')}
              className="flex items-center text-blue-600 mb-6 hover:text-blue-800"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Kembali</span>
            </button>

            <h2 className="text-2xl font-bold mb-6 text-gray-800">
              Tambah Pelanggan Baru
            </h2>

            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2">
                Nama Pelanggan
              </label>
              <input
                type="text"
                placeholder="Masukkan nama pelanggan"
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2">
                Harga Per Bulan (Rp)
              </label>
              <input
                type="number"
                placeholder="Contoh: 1500000"
                min="1"
                value={newCustomer.monthlyPrice}
                onChange={(e) => setNewCustomer({ ...newCustomer, monthlyPrice: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 font-semibold mb-2">
                Lama Kontrak (Bulan)
              </label>
              <input
                type="number"
                placeholder="Contoh: 3"
                min="1"
                max="24"
                value={newCustomer.contractMonths}
                onChange={(e) => setNewCustomer({ ...newCustomer, contractMonths: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={handleAddCustomer}
              disabled={saving}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3 rounded-lg hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-5 h-5 animate-spin" />}
              {saving ? 'Menyimpan...' : 'Simpan Pelanggan'}
            </button>
          </div>
        </div>
      )}

      {/* TABEL UTAMA */}
      {currentPage === 'mainTable' && (
        <div className="min-h-screen p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            <button
              onClick={() => setCurrentPage('dashboard')}
              className="flex items-center text-white mb-6 hover:text-gray-200 bg-gray-600 px-4 py-2 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Kembali ke Dashboard</span>
            </button>

            <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800">Daftar Pelanggan</h2>
                <button
                  onClick={() => setCurrentPage('inputCustomer')}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition"
                >
                  + Tambah Pelanggan
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="border-b-2 border-gray-300">
                    <tr>
                      <th className="py-3 px-4 font-semibold text-gray-700">Nama Pelanggan</th>
                      <th className="py-3 px-4 font-semibold text-gray-700">Harga/Bulan</th>
                      <th className="py-3 px-4 font-semibold text-gray-700">Durasi Kontrak</th>
                      <th className="py-3 px-4 font-semibold text-gray-700">Status Pembayaran</th>
                      <th className="py-3 px-4 font-semibold text-gray-700">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((customer) => (
                      <tr key={customer.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-4 px-4 font-medium text-gray-800">{customer.name}</td>
                        <td className="py-4 px-4 text-gray-600">
                          Rp {customer.monthlyPrice.toLocaleString('id-ID')}
                        </td>
                        <td className="py-4 px-4 text-gray-600">{customer.contractMonths} bulan</td>
                        <td className="py-4 px-4">
                          <div className="flex gap-2 flex-wrap">
                            {Array(customer.contractMonths).fill(null).map((_, idx) => (
                              <label key={idx} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={customer.monthlyPayments[idx] || false}
                                  onChange={() => handleTogglePayment(customer.id, idx)}
                                  className="w-5 h-5 cursor-pointer"
                                />
                                <span className="text-sm text-gray-600">Bulan {idx + 1}</span>
                              </label>
                            ))}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <button
                            onClick={() => handleGenerateReceipt(customer)}
                            className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
                          >
                            <Eye className="w-4 h-4" />
                            Kwitansi
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {customers.length === 0 && (
                <p className="text-center text-gray-500 py-8">
                  Belum ada pelanggan. Tambahkan pelanggan baru untuk memulai.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAMPILAN KWITANSI */}
      {currentPage === 'receipt' && receiptData && (
        <div className="min-h-screen p-4 md:p-8">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => setCurrentPage('mainTable')}
              className="flex items-center text-white mb-6 hover:text-gray-200 bg-gray-600 px-4 py-2 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Kembali</span>
            </button>

            <div className="bg-white rounded-2xl shadow-2xl p-8">
              <div className="text-center mb-8 pb-6 border-b-2 border-gray-200">
                <h1 className="text-3xl font-bold text-gray-800">KWITANSI</h1>
                <p className="text-gray-500">Bukti Pembayaran Layanan</p>
              </div>

              <div className="mb-8 space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-700 font-semibold">Nama Pelanggan:</span>
                  <span className="text-gray-900 font-bold">{receiptData.customer}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700 font-semibold">Tanggal Cetak:</span>
                  <span className="text-gray-900">{receiptData.generatedDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700 font-semibold">Durasi Kontrak:</span>
                  <span className="text-gray-900">{receiptData.contractMonths} Bulan</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700 font-semibold">Harga Per Bulan:</span>
                  <span className="text-gray-900">
                    Rp {receiptData.monthlyPrice.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="font-semibold text-gray-800 mb-4">Detail Pembayaran:</h3>
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left text-gray-700 font-semibold">Bulan</th>
                      <th className="px-4 py-2 text-right text-gray-700 font-semibold">Harga</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receiptData.paidMonths.map((month, idx) => (
                      <tr key={idx} className="border-b border-gray-200">
                        <td className="px-4 py-3 text-gray-700">{month.month}</td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          Rp {receiptData.monthlyPrice.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-gray-100 p-4 rounded-lg mb-8 flex justify-between items-center">
                <span className="text-lg font-bold text-gray-800">Total:</span>
                <span className="text-2xl font-bold text-green-600">
                  Rp {receiptData.totalPaid.toLocaleString('id-ID')}
                </span>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleDownloadReceipt}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition"
                >
                  <Download className="w-5 h-5" />
                  Download PDF
                </button>
                <button
                  onClick={handleSendWhatsApp}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition"
                >
                  <Send className="w-5 h-5" />
                  Kirim ke WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}