import {
  User,
  Phone,
  Mail,
  MapPin,
  Building2,
  Globe,
  Hash,
  CreditCard,
  Calendar,
  FileText,
  Car,
  Truck,
  Scale,
  Star,
  Pencil,
  Upload,
  Eye,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { putFormData, get } from '../api/client';

const InfoField = ({ icon: Icon, label, value, name, type = 'text', options = [], editable, onChange }) => {
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (type === 'file' && value instanceof File) {
      const objectUrl = URL.createObjectURL(value);
      setPreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    } else if (type === 'file' && typeof value === 'string' && value) {
      setPreview(value);
    } else {
      setPreview(null);
    }
  }, [value, type]);

  const renderInput = () => {
    if (!editable) {
      if (type === 'file') {
        return value ? (
          <a
            href={typeof value === 'string' ? value : '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#34C759] text-sm hover:underline flex items-center gap-1"
          >
            <Eye className="w-4 h-4" /> View Document
          </a>
        ) : <span className="text-gray-500 text-sm">No file uploaded</span>;
      }
      if (type === 'date' && value) {
        const date = new Date(value);
        // data.getTime() returns NaN if date is invalid
        return <span className="text-white text-sm">{!isNaN(date.getTime()) ? date.toLocaleDateString() : value}</span>;
      }
      return <span className="text-white text-sm">{value || '-'}</span>;
    }

    switch (type) {
      case 'date':
        // Safely parse date for input value
        let dateStr = '';
        if (value) {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            dateStr = date.toISOString().split('T')[0];
          }
        }
        return (
          <input
            type="date"
            name={name}
            value={dateStr}
            onChange={onChange}
            className="bg-transparent text-white text-sm flex-1 outline-none [color-scheme:dark]"
          />
        );
      case 'select':
        return (
          <select
            name={name}
            value={value || ''}
            onChange={onChange}
            className="bg-[#2C2C2C] text-white text-sm flex-1 outline-none border-none py-1"
          >
            <option value="">Select {label}</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );
      case 'file':
        return (
          <div className="flex flex-col gap-2 w-full">
            <div className="flex items-center gap-2">
              <label className="cursor-pointer bg-[#333333] hover:bg-[#444444] text-white text-xs px-3 py-2 rounded-lg flex items-center gap-2 transition-colors">
                <Upload className="w-3 h-3" />
                <span>Choose File</span>
                <input
                  type="file"
                  name={name}
                  onChange={onChange}
                  className="hidden"
                  accept="image/*,.pdf"
                />
              </label>
              {value && (
                <span className="text-xs text-[#A0A0A0] truncate max-w-[150px]">
                  {value instanceof File ? value.name : 'Existing file'}
                </span>
              )}
            </div>
            {(preview || (typeof value === 'string' && value)) && (
              <div className="mt-2 relative group w-full max-w-[200px] h-32 bg-black/20 rounded-lg overflow-hidden">
                {((preview && typeof preview === 'string' && (preview.match(/\.(jpg|jpeg|png|gif|webp)$/i) || preview.startsWith('blob:'))) ||
                  (typeof value === 'string' && value.match(/\.(jpg|jpeg|png|gif|webp)$/i))) ? (
                  <img
                    src={preview || value}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                    <FileText className="w-8 h-8 text-gray-500" />
                    {typeof value === 'string' && (
                      <a href={value} target="_blank" rel="noopener noreferrer" className="text-xs text-[#34C759] hover:underline">
                        View Current
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      default:
        return (
          <input
            type="text"
            name={name}
            value={value || ''}
            onChange={onChange}
            className="bg-transparent text-white text-sm flex-1 outline-none"
          />
        );
    }
  };

  return (
    <div className="mb-4">
      <label className="text-[#A0A0A0] text-xs block mb-1">{label}</label>
      <div className={`flex ${type === 'file' ? 'flex-col items-start' : 'items-center'} gap-3 py-3 px-4 rounded-xl bg-[#2C2C2C]`}>
        <div className="flex items-center gap-3 w-full">
          <Icon className="w-5 h-5 text-gray-500 flex-shrink-0" strokeWidth={2} />
          {type !== 'file' ? renderInput() : null}
        </div>
        {type === 'file' && <div className="pl-8 w-full">{renderInput()}</div>}
      </div>
    </div>
  );
};

export default function Profile() {
  const { user, token } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    driver_name: '',
    phone_number: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pin_code: '',
    license_number: '',
    license_expiry_date: '',
    license_image: '',
    id_proof: '',
    vehicle_ownership: '',
    available_vehicle: '',
    vehicle_number: '',
    capacity: '',
    vehicle_condition: '',
    insurance_number: '',
    insurance_expiry_date: '',
    insurance_document: '',
    pollution_certificate: '',
    pollution_certificate_expiry_date: '',
    pollution_certificate_document: '',
    ka_permit: '',
    ka_permit_expiry_date: '',
    ka_permit_document: '',
    account_holder_name: '',
    bank_name: '',
    branch_name: '',
    account_number: '',
    IFSC_code: '',
    delivery_type: '',
    status: '',
  });

  useEffect(() => {
    const fetchDriverData = async () => {
      try {
        setLoading(true);
        const driverId = user?.did ?? user?.data?.did ?? user?.id ?? user?.driver_id ?? user?.driverId ?? user?._id;

        const response = await get(`/driver/profile/${driverId}`, token);
        const driver = response.data || response;

        setFormData({
          driver_name: driver.driver_name || driver.name || '',
          phone_number: driver.phone_number || driver.phone || '',
          email: driver.email || '',
          address: driver.address || '',
          city: driver.city || '',
          state: driver.state || '',
          pin_code: driver.pin_code || driver.pincode || '',
          license_number: driver.license_number || driver.license || '',
          license_expiry_date: driver.license_expiry_date || '',
          license_image: driver.license_image || driver.licenseImage || '',
          id_proof: driver.id_proof || driver.idProof || '',
          vehicle_ownership: driver.vehicle_ownership || driver.vehicle_type || '',
          available_vehicle: driver.available_vehicle || driver.vehicleType || '',
          vehicle_number: driver.vehicle_number || driver.vehicleNumber || '',
          capacity: driver.capacity || '',
          vehicle_condition: driver.vehicle_condition || driver.vehicleCondition || '',
          insurance_number: driver.insurance_number || '',
          insurance_expiry_date: driver.insurance_expiry_date || '',
          insurance_document: driver.insurance_document || driver.insuranceDocument || '',
          pollution_certificate: driver.pollution_certificate || '',
          pollution_certificate_expiry_date: driver.pollution_certificate_expiry_date || '',
          pollution_certificate_document: driver.pollution_certificate_document || driver.pollutionCertificateDocument || '',
          ka_permit: driver.ka_permit || '',
          ka_permit_expiry_date: driver.ka_permit_expiry_date || '',
          ka_permit_document: driver.ka_permit_document || driver.kaPermitDocument || '',
          account_holder_name: driver.account_holder_name || '',
          bank_name: driver.bank_name || '',
          branch_name: driver.branch_name || '',
          account_number: driver.account_number || '',
          IFSC_code: driver.IFSC_code || driver.ifsc_code || '',
          delivery_type: driver.delivery_type || driver.deliveryType || '',
          status: driver.status || '',
        });
      } catch (error) {
        console.error('Failed to load driver data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchDriverData();
    } else {
      setLoading(false);
    }
  }, [user, token]);

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'file' ? files[0] : value
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const driverId = user?.did ?? user?.data?.did ?? user?.id ?? user?.driver_id ?? user?.driverId ?? user?._id;

      const formDataToSend = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key] instanceof File) {
          formDataToSend.append(key, formData[key]);
        } else if (typeof formData[key] === 'string' && formData[key] !== null) {
          formDataToSend.append(key, formData[key]);
        }
      });

      await putFormData(`/driver/${driverId}`, formDataToSend, token);

      setIsEditing(false);
      alert('Profile updated successfully');
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="px-4 py-4 pb-24 flex justify-center items-center h-screen">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 pb-24 space-y-6">
      <div className="rounded-2xl bg-[#10B981] p-4 relative">
        <div className="flex gap-4">
          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center flex-shrink-0">
            <User className="w-8 h-8 text-[#10B981]" strokeWidth={2} />
          </div>
          <div className="flex-1">
            <h2 className="text-white font-bold text-lg">{formData.driver_name}</h2>
            <p className="text-white/80 text-sm">Driver ID</p>
            <p className="text-white text-sm">{user?.did ?? user?.data?.did ?? user?.id}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2 py-1 rounded-lg bg-[#F59E0B] text-white text-xs">
                {formData.status || 'Available'}
              </span>
            </div>
          </div>
          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="w-10 h-10 rounded-full bg-white flex items-center justify-center absolute top-4 right-4"
            >
              <Pencil className="w-5 h-5 text-gray-700" strokeWidth={2} />
            </button>
          ) : (
            <div className="absolute top-4 right-4 flex gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3 py-1 rounded-lg bg-gray-500 text-white text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-3 py-1 rounded-lg bg-white text-gray-700 text-sm disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-white font-bold text-base mb-4">Personal Information</h3>
        <InfoField icon={User} label="Name" value={formData.driver_name} name="driver_name" editable={isEditing} onChange={handleChange} />
        <InfoField icon={Phone} label="Phone Number" value={formData.phone_number} name="phone_number" editable={isEditing} onChange={handleChange} />
        <InfoField icon={Mail} label="Email" value={formData.email} name="email" editable={isEditing} onChange={handleChange} />
        <InfoField icon={MapPin} label="Address" value={formData.address} name="address" editable={isEditing} onChange={handleChange} />
        <InfoField icon={Building2} label="City" value={formData.city} name="city" editable={isEditing} onChange={handleChange} />
        <InfoField icon={Globe} label="State" value={formData.state} name="state" editable={isEditing} onChange={handleChange} />
        <InfoField icon={Hash} label="Pin Code" value={formData.pin_code} name="pin_code" editable={isEditing} onChange={handleChange} />
      </div>

      <div>
        <h3 className="text-white font-bold text-base mb-4">License Information</h3>
        <InfoField icon={CreditCard} label="License Number" value={formData.license_number} name="license_number" editable={isEditing} onChange={handleChange} />
        <InfoField icon={Calendar} label="License Expiry Date" value={formData.license_expiry_date} name="license_expiry_date" type="date" editable={isEditing} onChange={handleChange} />
        <InfoField icon={FileText} label="License Image" value={formData.license_image} name="license_image" type="file" editable={isEditing} onChange={handleChange} />
        <InfoField icon={FileText} label="ID Proof" value={formData.id_proof} name="id_proof" type="file" editable={isEditing} onChange={handleChange} />
      </div>

      <div>
        <h3 className="text-white font-bold text-base mb-4">Vehicle Information</h3>
        <InfoField
          icon={Car}
          label="Vehicle Type"
          value={formData.vehicle_ownership}
          name="vehicle_ownership"
          type="select"
          options={['R1 Vehicle', 'Rental Vehicle', 'Third Party Vehicle']}
          editable={isEditing}
          onChange={handleChange}
        />
        <InfoField
          icon={Truck}
          label="Available Vehicle"
          value={formData.available_vehicle}
          name="available_vehicle"
          type="select"
          options={['Tata Ace', 'Mahindra Bolero', 'Ashok Leyland', 'Eicher Pro', 'Tata 407']}
          editable={isEditing}
          onChange={handleChange}
        />
        <InfoField icon={Car} label="Vehicle Number" value={formData.vehicle_number} name="vehicle_number" editable={isEditing} onChange={handleChange} />
        <InfoField icon={Scale} label="Capacity (KG)" value={formData.capacity} name="capacity" editable={isEditing} onChange={handleChange} />
        <InfoField
          icon={Star}
          label="Vehicle Condition"
          value={formData.vehicle_condition}
          name="vehicle_condition"
          type="select"
          options={['Good', 'Excellent', 'Fair', 'Poor']}
          editable={isEditing}
          onChange={handleChange}
        />
      </div>

      <div>
        <h3 className="text-white font-bold text-base mb-4">Insurance Information</h3>
        <InfoField icon={FileText} label="Insurance Number" value={formData.insurance_number} name="insurance_number" editable={isEditing} onChange={handleChange} />
        <InfoField icon={Calendar} label="Insurance Expiry Date" value={formData.insurance_expiry_date} name="insurance_expiry_date" type="date" editable={isEditing} onChange={handleChange} />
        <InfoField icon={FileText} label="Insurance Document" value={formData.insurance_document} name="insurance_document" type="file" editable={isEditing} onChange={handleChange} />
      </div>

      <div>
        <h3 className="text-white font-bold text-base mb-4">Permits & Certificates</h3>
        <InfoField icon={FileText} label="Pollution Certificate" value={formData.pollution_certificate} name="pollution_certificate" editable={isEditing} onChange={handleChange} />
        <InfoField icon={Calendar} label="Pollution Expiry Date" value={formData.pollution_certificate_expiry_date} name="pollution_certificate_expiry_date" type="date" editable={isEditing} onChange={handleChange} />
        <InfoField icon={FileText} label="Pollution Certificate Document" value={formData.pollution_certificate_document} name="pollution_certificate_document" type="file" editable={isEditing} onChange={handleChange} />
        <InfoField icon={FileText} label="KA Permit" value={formData.ka_permit} name="ka_permit" editable={isEditing} onChange={handleChange} />
        <InfoField icon={Calendar} label="KA Permit Expiry Date" value={formData.ka_permit_expiry_date} name="ka_permit_expiry_date" type="date" editable={isEditing} onChange={handleChange} />
        <InfoField icon={FileText} label="KA Permit Document" value={formData.ka_permit_document} name="ka_permit_document" type="file" editable={isEditing} onChange={handleChange} />
      </div>

      <div>
        <h3 className="text-white font-bold text-base mb-4">Bank Account Details</h3>
        <InfoField icon={User} label="Account Holder Name" value={formData.account_holder_name} name="account_holder_name" editable={isEditing} onChange={handleChange} />
        <InfoField icon={Building2} label="Bank Name" value={formData.bank_name} name="bank_name" editable={isEditing} onChange={handleChange} />
        <InfoField icon={Building2} label="Branch Name" value={formData.branch_name} name="branch_name" editable={isEditing} onChange={handleChange} />
        <InfoField icon={CreditCard} label="Account Number" value={formData.account_number} name="account_number" editable={isEditing} onChange={handleChange} />
        <InfoField icon={Hash} label="IFSC Code" value={formData.IFSC_code} name="IFSC_code" editable={isEditing} onChange={handleChange} />
      </div>

      <div>
        <h3 className="text-white font-bold text-base mb-4">Delivery Type</h3>
        <InfoField
          icon={Truck}
          label="Delivery Type"
          value={formData.delivery_type}
          name="delivery_type"
          type="select"
          options={['LOCAL GRADE ORDER', 'BOX ORDER', 'Both Types']}
          editable={isEditing}
          onChange={handleChange}
        />
      </div>
    </div>
  );
}
