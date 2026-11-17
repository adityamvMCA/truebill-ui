import apiClient from "../apiClient";


const base = (code) => `/products/code/${encodeURIComponent(code)}`;

const productReportApi = {
  getProduct: (code) => apiClient.get(base(code)),
  getStock: (code, params) => apiClient.get(`${base(code)}/reports/stock`, { params }),
  getPartyWise: (code, params) =>
    apiClient.get(`${base(code)}/reports/party-wise`, { params }),
  getGodown: (code) => apiClient.get(`${base(code)}/reports/godown`),
  getPartyPrices: (code) => apiClient.get(`${base(code)}/reports/party-prices`),
};

export default productReportApi;
