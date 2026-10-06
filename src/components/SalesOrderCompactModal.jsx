import { useState } from "react";
import {
    X,
    ShoppingCart,
    User,
    Package,
    Truck,
    IndianRupee,
    FileText,
    ChevronDown,
    Plus,
    Trash2,
    Calendar,
    MapPin,
    Save,
    Send,
} from "lucide-react";
import "../styles/sales-order-compact-modal.css";
function SalesOrderCompactModal({
    isOpen,
    onClose,
    onSave,
}) {
    const [activeSection, setActiveSection] =
        useState("customer");

    const [formData, setFormData] = useState({
        orderDate: new Date()
            .toISOString()
            .split("T")[0],
        customer: "",
        customerCode: "",
        customerName: "",
        deliveryAddress: "",
        warehouse: "",
        priceList: "",
        notes: "",
    });

    const [items, setItems] = useState([]);

    if (!isOpen) {
        return null;
    }

    const updateField = (name, value) => {
        setFormData((previous) => ({
            ...previous,
            [name]: value,
        }));
    };

    const toggleSection = (section) => {
        setActiveSection((previous) =>
            previous === section
                ? null
                : section
        );
    };

    const addProduct = () => {
        setItems((previous) => [
            ...previous,
            {
                id:
                    Date.now() +
                    Math.random(),
                product: "",
                quantity: 1,
                rate: 0,
                tax: 18,
            },
        ]);
    };

    const updateProduct = (
        id,
        field,
        value
    ) => {
        setItems((previous) =>
            previous.map((item) =>
                item.id === id
                    ? {
                          ...item,
                          [field]:
                              [
                                  "quantity",
                                  "rate",
                                  "tax",
                              ].includes(field)
                                  ? Number(
                                        value
                                    )
                                  : value,
                      }
                    : item
            )
        );
    };

    const removeProduct = (id) => {
        setItems((previous) =>
            previous.filter(
                (item) =>
                    item.id !== id
            )
        );
    };

    const calculateItemTotal = (item) => {
        const base =
            Number(item.quantity || 0) *
            Number(item.rate || 0);

        const tax =
            (base *
                Number(item.tax || 0)) /
            100;

        return base + tax;
    };

    const grandTotal = items.reduce(
        (sum, item) =>
            sum +
            calculateItemTotal(item),
        0
    );

    const handleSave = (status) => {
        const orderData = {
            orderDate:
                formData.orderDate,
            customer:
                formData.customer,
            customerCode:
                formData.customerCode,
            customerName:
                formData.customerName,
            deliveryAddress:
                formData.deliveryAddress,
            warehouse:
                formData.warehouse,
            priceList:
                formData.priceList,
            notes:
                formData.notes,
            items,
            grandTotal,
            status,
        };

        if (onSave) {
            onSave(orderData);
        }

        onClose();
    };

    return (
        <div className="compact-sales-modal-overlay">
            <div className="compact-sales-modal">
                <div className="compact-sales-modal-header">
                    <div className="compact-sales-title">
                        <div className="compact-sales-icon">
                            <ShoppingCart
                                size={18}
                            />
                        </div>

                        <div>
                            <h2>
                                Create Sales Order
                            </h2>

                            <span>
                                New Sales Order
                            </span>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="compact-sales-close"
                        onClick={onClose}
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="compact-sales-body">
                    {/* CUSTOMER */}

                    <div
                        className={`compact-sales-block ${
                            activeSection ===
                            "customer"
                                ? "compact-sales-block-active"
                                : ""
                        }`}
                    >
                        <button
                            type="button"
                            className="compact-sales-block-header"
                            onClick={() =>
                                toggleSection(
                                    "customer"
                                )
                            }
                        >
                            <div className="compact-sales-block-left">
                                <div className="compact-sales-block-icon">
                                    <User
                                        size={
                                            17
                                        }
                                    />
                                </div>

                                <div>
                                    <strong>
                                        Customer
                                    </strong>

                                    <span>
                                        {formData.customer ||
                                            "Select customer"}
                                    </span>
                                </div>
                            </div>

                            <ChevronDown
                                size={17}
                                className={
                                    activeSection ===
                                    "customer"
                                        ? "compact-sales-chevron-open"
                                        : ""
                                }
                            />
                        </button>

                        {activeSection ===
                            "customer" && (
                            <div className="compact-sales-block-content">
                                <div className="compact-sales-grid">
                                    <div className="compact-sales-field compact-sales-field-full">
                                        <label>
                                            Customer
                                        </label>

                                        <select
                                            value={
                                                formData.customer
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                updateField(
                                                    "customer",
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                        >
                                            <option value="">
                                                Select Customer
                                            </option>

                                            <option value="Shree Balaji Constructions">
                                                Shree Balaji
                                                Constructions
                                            </option>

                                            <option value="Vijay Steel Industries">
                                                Vijay Steel
                                                Industries
                                            </option>

                                            <option value="Karnataka Electricals">
                                                Karnataka
                                                Electricals
                                            </option>

                                            <option value="Om Sai Enterprises">
                                                Om Sai
                                                Enterprises
                                            </option>
                                        </select>
                                    </div>

                                    <div className="compact-sales-field">
                                        <label>
                                            Customer Code
                                        </label>

                                        <input
                                            type="text"
                                            value={
                                                formData.customerCode
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                updateField(
                                                    "customerCode",
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                            placeholder="CU0001"
                                        />
                                    </div>

                                    <div className="compact-sales-field">
                                        <label>
                                            Customer Name
                                        </label>

                                        <input
                                            type="text"
                                            value={
                                                formData.customerName
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                updateField(
                                                    "customerName",
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                            placeholder="Customer name"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* PRODUCTS */}

                    <div
                        className={`compact-sales-block ${
                            activeSection ===
                            "products"
                                ? "compact-sales-block-active"
                                : ""
                        }`}
                    >
                        <button
                            type="button"
                            className="compact-sales-block-header"
                            onClick={() =>
                                toggleSection(
                                    "products"
                                )
                            }
                        >
                            <div className="compact-sales-block-left">
                                <div className="compact-sales-block-icon">
                                    <Package
                                        size={
                                            17
                                        }
                                    />
                                </div>

                                <div>
                                    <strong>
                                        Products
                                    </strong>

                                    <span>
                                        {items.length}{" "}
                                        product
                                        {items.length !==
                                        1
                                            ? "s"
                                            : ""}{" "}
                                        added
                                    </span>
                                </div>
                            </div>

                            <ChevronDown
                                size={17}
                                className={
                                    activeSection ===
                                    "products"
                                        ? "compact-sales-chevron-open"
                                        : ""
                                }
                            />
                        </button>

                        {activeSection ===
                            "products" && (
                            <div className="compact-sales-block-content">
                                <button
                                    type="button"
                                    className="compact-sales-add-product"
                                    onClick={
                                        addProduct
                                    }
                                >
                                    <Plus
                                        size={
                                            15
                                        }
                                    />
                                    Add Product
                                </button>

                                {items.length ===
                                0 ? (
                                    <div className="compact-sales-empty">
                                        <Package
                                            size={
                                                25
                                            }
                                        />

                                        <span>
                                            No
                                            products
                                            added
                                        </span>

                                        <small>
                                            Click
                                            Add
                                            Product
                                            to
                                            continue
                                        </small>
                                    </div>
                                ) : (
                                    <div className="compact-sales-products">
                                        {items.map(
                                            (
                                                item,
                                                index
                                            ) => (
                                                <div
                                                    className="compact-sales-product"
                                                    key={
                                                        item.id
                                                    }
                                                >
                                                    <div className="compact-sales-product-number">
                                                        {index +
                                                            1}
                                                    </div>

                                                    <div className="compact-sales-field">
                                                        <label>
                                                            Product
                                                        </label>

                                                        <input
                                                            type="text"
                                                            value={
                                                                item.product
                                                            }
                                                            onChange={(
                                                                event
                                                            ) =>
                                                                updateProduct(
                                                                    item.id,
                                                                    "product",
                                                                    event
                                                                        .target
                                                                        .value
                                                                )
                                                            }
                                                            placeholder="Product name"
                                                        />
                                                    </div>

                                                    <div className="compact-sales-field compact-sales-small-field">
                                                        <label>
                                                            Qty
                                                        </label>

                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={
                                                                item.quantity
                                                            }
                                                            onChange={(
                                                                event
                                                            ) =>
                                                                updateProduct(
                                                                    item.id,
                                                                    "quantity",
                                                                    event
                                                                        .target
                                                                        .value
                                                                )
                                                            }
                                                        />
                                                    </div>

                                                    <div className="compact-sales-field compact-sales-small-field">
                                                        <label>
                                                            Rate
                                                        </label>

                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={
                                                                item.rate
                                                            }
                                                            onChange={(
                                                                event
                                                            ) =>
                                                                updateProduct(
                                                                    item.id,
                                                                    "rate",
                                                                    event
                                                                        .target
                                                                        .value
                                                                )
                                                            }
                                                        />
                                                    </div>

                                                    <button
                                                        type="button"
                                                        className="compact-sales-delete"
                                                        onClick={() =>
                                                            removeProduct(
                                                                item.id
                                                            )
                                                        }
                                                    >
                                                        <Trash2
                                                            size={
                                                                15
                                                            }
                                                        />
                                                    </button>
                                                </div>
                                            )
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* DELIVERY */}

                    <div
                        className={`compact-sales-block ${
                            activeSection ===
                            "delivery"
                                ? "compact-sales-block-active"
                                : ""
                        }`}
                    >
                        <button
                            type="button"
                            className="compact-sales-block-header"
                            onClick={() =>
                                toggleSection(
                                    "delivery"
                                )
                            }
                        >
                            <div className="compact-sales-block-left">
                                <div className="compact-sales-block-icon">
                                    <Truck
                                        size={
                                            17
                                        }
                                    />
                                </div>

                                <div>
                                    <strong>
                                        Delivery
                                    </strong>

                                    <span>
                                        Delivery
                                        information
                                    </span>
                                </div>
                            </div>

                            <ChevronDown
                                size={17}
                                className={
                                    activeSection ===
                                    "delivery"
                                        ? "compact-sales-chevron-open"
                                        : ""
                                }
                            />
                        </button>

                        {activeSection ===
                            "delivery" && (
                            <div className="compact-sales-block-content">
                                <div className="compact-sales-grid">
                                    <div className="compact-sales-field">
                                        <label>
                                            <Calendar
                                                size={
                                                    13
                                                }
                                            />
                                            Order Date
                                        </label>

                                        <input
                                            type="date"
                                            value={
                                                formData.orderDate
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                updateField(
                                                    "orderDate",
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                        />
                                    </div>

                                    <div className="compact-sales-field">
                                        <label>
                                            Warehouse
                                        </label>

                                        <select
                                            value={
                                                formData.warehouse
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                updateField(
                                                    "warehouse",
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                        >
                                            <option value="">
                                                Select Warehouse
                                            </option>

                                            <option value="Main Warehouse">
                                                Main
                                                Warehouse
                                            </option>

                                            <option value="Bagalkot Warehouse">
                                                Bagalkot
                                                Warehouse
                                            </option>

                                            <option value="Hubli Warehouse">
                                                Hubli
                                                Warehouse
                                            </option>
                                        </select>
                                    </div>

                                    <div className="compact-sales-field compact-sales-field-full">
                                        <label>
                                            <MapPin
                                                size={
                                                    13
                                                }
                                            />
                                            Delivery
                                            Address
                                        </label>

                                        <textarea
                                            rows="3"
                                            value={
                                                formData.deliveryAddress
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                updateField(
                                                    "deliveryAddress",
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                            placeholder="Enter delivery address"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* PRICING */}

                    <div
                        className={`compact-sales-block ${
                            activeSection ===
                            "pricing"
                                ? "compact-sales-block-active"
                                : ""
                        }`}
                    >
                        <button
                            type="button"
                            className="compact-sales-block-header"
                            onClick={() =>
                                toggleSection(
                                    "pricing"
                                )
                            }
                        >
                            <div className="compact-sales-block-left">
                                <div className="compact-sales-block-icon">
                                    <IndianRupee
                                        size={
                                            17
                                        }
                                    />
                                </div>

                                <div>
                                    <strong>
                                        Pricing
                                    </strong>

                                    <span>
                                        ₹
                                        {grandTotal.toLocaleString(
                                            "en-IN",
                                            {
                                                minimumFractionDigits: 2,
                                            }
                                        )}
                                    </span>
                                </div>
                            </div>

                            <ChevronDown
                                size={17}
                                className={
                                    activeSection ===
                                    "pricing"
                                        ? "compact-sales-chevron-open"
                                        : ""
                                }
                            />
                        </button>

                        {activeSection ===
                            "pricing" && (
                            <div className="compact-sales-block-content">
                                <div className="compact-sales-price-summary">
                                    <div>
                                        <span>
                                            Products
                                        </span>

                                        <strong>
                                            {
                                                items.length
                                            }
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Subtotal
                                        </span>

                                        <strong>
                                            ₹
                                            {grandTotal.toLocaleString(
                                                "en-IN",
                                                {
                                                    minimumFractionDigits: 2,
                                                }
                                            )}
                                        </strong>
                                    </div>

                                    <div className="compact-sales-final-total">
                                        <span>
                                            Grand
                                            Total
                                        </span>

                                        <strong>
                                            ₹
                                            {grandTotal.toLocaleString(
                                                "en-IN",
                                                {
                                                    minimumFractionDigits: 2,
                                                }
                                            )}
                                        </strong>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* NOTES */}

                    <div
                        className={`compact-sales-block ${
                            activeSection ===
                            "notes"
                                ? "compact-sales-block-active"
                                : ""
                        }`}
                    >
                        <button
                            type="button"
                            className="compact-sales-block-header"
                            onClick={() =>
                                toggleSection(
                                    "notes"
                                )
                            }
                        >
                            <div className="compact-sales-block-left">
                                <div className="compact-sales-block-icon">
                                    <FileText
                                        size={
                                            17
                                        }
                                    />
                                </div>

                                <div>
                                    <strong>
                                        Notes
                                    </strong>

                                    <span>
                                        Optional
                                        order notes
                                    </span>
                                </div>
                            </div>

                            <ChevronDown
                                size={17}
                                className={
                                    activeSection ===
                                    "notes"
                                        ? "compact-sales-chevron-open"
                                        : ""
                                }
                            />
                        </button>

                        {activeSection ===
                            "notes" && (
                            <div className="compact-sales-block-content">
                                <textarea
                                    className="compact-sales-notes"
                                    rows="4"
                                    value={
                                        formData.notes
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateField(
                                            "notes",
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                    placeholder="Enter order notes..."
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="compact-sales-modal-footer">
                    <button
                        type="button"
                        className="compact-sales-cancel"
                        onClick={onClose}
                    >
                        <X size={15} />
                        Cancel
                    </button>

                    <div className="compact-sales-footer-actions">
                        <button
                            type="button"
                            className="compact-sales-draft"
                            onClick={() =>
                                handleSave(
                                    "Draft"
                                )
                            }
                        >
                            <Save size={15} />
                            Save Draft
                        </button>

                        <button
                            type="button"
                            className="compact-sales-create"
                            onClick={() =>
                                handleSave(
                                    "Created"
                                )
                            }
                        >
                            <Send size={15} />
                            Create Order
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SalesOrderCompactModal;