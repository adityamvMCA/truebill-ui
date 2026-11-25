import apiClient from "../apiClient";

const hrApi = {
  // Employee APIs
  getEmployees: (params = {}) => apiClient.get("/hr/employees", { params }),
  getEmployeeById: (id) => apiClient.get(`/hr/employees/${id}`),
  createEmployee: (data) => apiClient.post("/hr/employees", data),
  updateEmployee: (id, data) => apiClient.put(`/hr/employees/${id}`, data),
  deleteEmployee: (id) => apiClient.delete(`/hr/employees/${id}`),

  // Payroll APIs
  getSalarySlips: (params = {}) => apiClient.get("/hr/payroll", { params }),
  getSalarySlipById: (id) => apiClient.get(`/hr/payroll/${id}`),
  generatePayroll: (data) => apiClient.post("/hr/payroll/generate", data),
  markSalaryPaid: (id, data) => apiClient.put(`/hr/payroll/${id}/pay`, data),
  deleteSalarySlip: (id) => apiClient.delete(`/hr/payroll/${id}`),
};

export default hrApi;
