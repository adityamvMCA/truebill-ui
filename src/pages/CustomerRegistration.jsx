import { useState } from "react";

import {
    UserPlus,
    User,
    MapPin,
    Phone,
    Mail,
    Building2,
    CreditCard,
    FileText,
    X,
    Save,
} from "lucide-react";
import Button from "../components/common/Form/Button";
import Input from "../components/common/Form/Input";
import Select from "../components/common/Form/Select";
import Textarea from "../components/common/Form/Textarea";
import BoxModal from "../components/common/Modal/BoxModal";


const CustomerRegistration = ({
    isOpen,
    onClose,
    onSave,
    editData = null,
}) => {
    /* =====================================================
       FORM DATA
    ===================================================== */

    const [formData, setFormData] = useState({
        customerCode: "",
        customerName: "",
        customerType: "Business",

        contactPerson: "",
        phone: "",
        alternatePhone: "",
        email: "",

        gstNo: "",
        panNo: "",

        billingAddress: "",
        shippingAddress: "",

        city: "",
        state: "Karnataka",
        pincode: "",
        country: "India",

        paymentTerms: "30 Days",
        creditLimit: "",

        priceList: "Standard",

        status: "Active",

        notes: "",
    });

    /* =====================================================
       CHANGE HANDLER
    ===================================================== */

    const handleChange = (event) => {
        const {
            name,
            value,
        } = event.target;

        setFormData((previous) => ({
            ...previous,
            [name]: value,
        }));
    };

    /* =====================================================
       SAVE
    ===================================================== */

    const handleSave = () => {
        const payload = {
            ...formData,

            creditLimit:
                Number(formData.creditLimit) || 0,

            status: formData.status || "Active",
        };

        console.log(
            "Customer Registration:",
            payload
        );

        onSave?.(payload);
    };

    /* =====================================================
       OPTIONS
    ===================================================== */

    const customerTypeOptions = [
        {
            value: "Business",
            label: "Business",
        },
        {
            value: "Individual",
            label: "Individual",
        },
    ];

    const stateOptions = [
        {
            value: "Karnataka",
            label: "Karnataka",
        },
        {
            value: "Maharashtra",
            label: "Maharashtra",
        },
        {
            value: "Goa",
            label: "Goa",
        },
        {
            value: "Telangana",
            label: "Telangana",
        },
        {
            value: "Tamil Nadu",
            label: "Tamil Nadu",
        },
    ];

    const paymentTermsOptions = [
        {
            value: "Cash",
            label: "Cash",
        },
        {
            value: "15 Days",
            label: "15 Days",
        },
        {
            value: "30 Days",
            label: "30 Days",
        },
        {
            value: "45 Days",
            label: "45 Days",
        },
        {
            value: "60 Days",
            label: "60 Days",
        },
    ];

    const priceListOptions = [
        {
            value: "Standard",
            label: "Standard",
        },
        {
            value: "Wholesale",
            label: "Wholesale",
        },
        {
            value: "Retail",
            label: "Retail",
        },
    ];

    const statusOptions = [
        {
            value: "Active",
            label: "Active",
        },
        {
            value: "Inactive",
            label: "Inactive",
        },
    ];

    /* =====================================================
       FOOTER
    ===================================================== */

    const footer = (
        <>
            <Button
                type="button"
                variant="secondary"
                icon={X}
                onClick={onClose}
            >
                Cancel
            </Button>

            <div className="box-modal-footer-actions">
                <Button
                    type="button"
                    variant="primary"
                    icon={Save}
                    onClick={handleSave}
                >
                    Save Customer
                </Button>
            </div>
        </>
    );

    /* =====================================================
       RENDER
    ===================================================== */

    return (
        <BoxModal
            show={isOpen}
            onClose={onClose}
            title={
                editData
                    ? "Edit Customer"
                    : "Customer Registration"
            }
            subtitle={
                editData
                    ? "Update customer information"
                    : "Create a new customer"
            }
            icon={UserPlus}
            width="1100px"
            footer={footer}
        >
            {/* =================================================
          CUSTOMER INFORMATION
      ================================================= */}

            <div className="box-modal-section">

                <div className="box-modal-section-header">

                    <div className="box-modal-section-icon">
                        <User size={17} />
                    </div>

                    <div className="box-modal-section-header-content">
                        <h3>
                            Customer Information
                        </h3>

                        <p>
                            Basic customer details
                        </p>
                    </div>

                </div>

                <div className="box-modal-form-grid">

                    <Input
                        label="Customer Code"
                        name="customerCode"
                        value={
                            formData.customerCode
                        }
                        onChange={
                            handleChange
                        }
                        placeholder="CU0001"
                        icon={FileText}
                    />

                    <Input
                        label="Customer Name"
                        name="customerName"
                        value={
                            formData.customerName
                        }
                        onChange={
                            handleChange
                        }
                        placeholder="Enter customer name"
                        icon={User}
                        required
                    />

                    <Select
                        label="Customer Type"
                        name="customerType"
                        value={
                            formData.customerType
                        }
                        onChange={
                            handleChange
                        }
                        options={
                            customerTypeOptions
                        }
                        icon={Building2}
                    />

                    <Input
                        label="Contact Person"
                        name="contactPerson"
                        value={
                            formData.contactPerson
                        }
                        onChange={
                            handleChange
                        }
                        placeholder="Enter contact person"
                        icon={User}
                    />

                    <Input
                        label="Phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={
                            handleChange
                        }
                        placeholder="Enter phone number"
                        icon={Phone}
                        required
                    />

                    <Input
                        label="Alternate Phone"
                        name="alternatePhone"
                        type="tel"
                        value={
                            formData.alternatePhone
                        }
                        onChange={
                            handleChange
                        }
                        placeholder="Enter alternate number"
                        icon={Phone}
                    />

                    <Input
                        label="Email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={
                            handleChange
                        }
                        placeholder="customer@example.com"
                        icon={Mail}
                    />

                </div>

            </div>

            {/* =================================================
          TAX INFORMATION
      ================================================= */}

            <div className="box-modal-section">

                <div className="box-modal-section-header">

                    <div className="box-modal-section-icon">
                        <CreditCard size={17} />
                    </div>

                    <div className="box-modal-section-header-content">
                        <h3>
                            Tax Information
                        </h3>

                        <p>
                            GST and PAN information
                        </p>
                    </div>

                </div>

                <div className="box-modal-form-grid">

                    <Input
                        label="GST Number"
                        name="gstNo"
                        value={formData.gstNo}
                        onChange={
                            handleChange
                        }
                        placeholder="29XXXXXXXXXXXXXX"
                        icon={CreditCard}
                    />

                    <Input
                        label="PAN Number"
                        name="panNo"
                        value={formData.panNo}
                        onChange={
                            handleChange
                        }
                        placeholder="ABCDE1234F"
                        icon={CreditCard}
                    />

                </div>

            </div>

            {/* =================================================
          ADDRESS
      ================================================= */}

            <div className="box-modal-section">

                <div className="box-modal-section-header">

                    <div className="box-modal-section-icon">
                        <MapPin size={17} />
                    </div>

                    <div className="box-modal-section-header-content">
                        <h3>
                            Address Details
                        </h3>

                        <p>
                            Billing and shipping
                            information
                        </p>
                    </div>

                </div>

                <div className="box-modal-form-grid">

                    <div className="box-modal-form-full">

                        <Textarea
                            label="Billing Address"
                            name="billingAddress"
                            value={
                                formData.billingAddress
                            }
                            onChange={
                                handleChange
                            }
                            placeholder="Enter billing address"
                            rows={3}
                        />

                    </div>

                    <div className="box-modal-form-full">

                        <Textarea
                            label="Shipping Address"
                            name="shippingAddress"
                            value={
                                formData.shippingAddress
                            }
                            onChange={
                                handleChange
                            }
                            placeholder="Enter shipping address"
                            rows={3}
                        />

                    </div>

                    <Input
                        label="City"
                        name="city"
                        value={formData.city}
                        onChange={
                            handleChange
                        }
                        placeholder="Enter city"
                    />

                    <Select
                        label="State"
                        name="state"
                        value={formData.state}
                        onChange={
                            handleChange
                        }
                        options={stateOptions}
                    />

                    <Input
                        label="Pincode"
                        name="pincode"
                        value={
                            formData.pincode
                        }
                        onChange={
                            handleChange
                        }
                        placeholder="587101"
                    />

                    <Input
                        label="Country"
                        name="country"
                        value={
                            formData.country
                        }
                        onChange={
                            handleChange
                        }
                        placeholder="India"
                    />

                </div>

            </div>

            {/* =================================================
          FINANCIAL INFORMATION
      ================================================= */}

            <div className="box-modal-section">

                <div className="box-modal-section-header">

                    <div className="box-modal-section-icon">
                        <CreditCard size={17} />
                    </div>

                    <div className="box-modal-section-header-content">
                        <h3>
                            Financial Information
                        </h3>

                        <p>
                            Credit and payment settings
                        </p>
                    </div>

                </div>

                <div className="box-modal-form-grid">

                    <Select
                        label="Payment Terms"
                        name="paymentTerms"
                        value={
                            formData.paymentTerms
                        }
                        onChange={
                            handleChange
                        }
                        options={
                            paymentTermsOptions
                        }
                    />

                    <Input
                        label="Credit Limit"
                        name="creditLimit"
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                            formData.creditLimit
                        }
                        onChange={
                            handleChange
                        }
                        placeholder="0.00"
                    />

                    <Select
                        label="Price List"
                        name="priceList"
                        value={
                            formData.priceList
                        }
                        onChange={
                            handleChange
                        }
                        options={
                            priceListOptions
                        }
                    />

                    <Select
                        label="Status"
                        name="status"
                        value={
                            formData.status
                        }
                        onChange={
                            handleChange
                        }
                        options={
                            statusOptions
                        }
                    />

                </div>

            </div>

            {/* =================================================
          NOTES
      ================================================= */}

            <div className="box-modal-section">

                <div className="box-modal-section-header">

                    <div className="box-modal-section-icon">
                        <FileText size={17} />
                    </div>

                    <div className="box-modal-section-header-content">
                        <h3>
                            Additional Information
                        </h3>

                        <p>
                            Notes and special instructions
                        </p>
                    </div>

                </div>

                <div className="box-modal-form-grid">

                    <div className="box-modal-form-full">

                        <Textarea
                            label="Notes"
                            name="notes"
                            value={formData.notes}
                            onChange={
                                handleChange
                            }
                            placeholder="Enter notes..."
                            rows={4}
                        />

                    </div>

                </div>

            </div>

        </BoxModal>
    );
};

export default CustomerRegistration;