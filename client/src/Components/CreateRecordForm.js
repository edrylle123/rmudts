

import React, { useState, useRef, useEffect } from "react";
import "./CreateRecordForm.css";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import axios from "./axios";
import { QRCodeCanvas } from "qrcode.react";
import Select from "react-select"; // Import react-select
import 'bootstrap/dist/css/bootstrap.min.css';

const CLASSIFICATION_OPTIONS = ["Academic", "Administrative", "Financial", "HR", "Others"];
const PRIORITY_OPTIONS = ["Normal", "Urgent", "Immediate"];
const ORIGIN_OPTIONS = ["Internal", "External"]; // Document type options
const RETENTION_OPTIONS = [
  { label: "1 Year", value: "1 Year" },
  { label: "2 Years", value: "2 Years" },
  { label: "3 Years", value: "3 Years" },
  { label: "4 Years", value: "4 Years" },
  { label: "5 Years", value: "5 Years" },
  { label: "6 Years", value: "6 Years" },
  { label: "7 Years", value: "7 Years" },
  { label: "8 Years", value: "8 Years" },
  { label: "9 Years", value: "9 Years" },
  { label: "10 Years", value: "10 Years" },
  { label: "Permanent", value: "Permanent" },
];
const DESTINATION_OFFICES = [
  "Accounting Office",
  "Cashier",
  "Supply Office",
  "Office of the Budget Officer",
  "Office of the Chief Administrative Officer- Finance",
  "PACD",
  "Marketing",
  "Office of the Planning Officer",
  "Office of the Campus Administrator",
  "Legal Office",
  "Quality and Assurance Office",
  "Registrar Office",
  "Office of the Vice President - Admin and Finance",
  "Office of the Board Secretary",
  "Office of the President",
  "Office of the Alumni",
  "Human Resource Office",
  "International Relations Office",
  "General Servicing Unit",
  "Planning Management Unit",
  "Information Technology Office",
  "Information Office",
  "Procurement Office",
  "Office of the Supervising Administrative Officer",
];
const CONCERNED_PERSONNEL = [
  " Elizabeth R. Oppuer",
" Jamina G. Camayang",
" Maria C. Hernandez",
" Katherina C. Sarsonas",
" Jonah C. Celestino",
" Isabel F. Salvador",
" Rosalyn L. Delizo",
" Leila M. Sabbaluca",
" Fredisminda M. Dolojan",
" Cynthia Grace T. Valdez",
" Jimmy S. Matias",
" Edgar V. Benabise",
" Mila T. Benabise",
" George S. Lajola",
" Julie E. Luis",
" Agaton Jr. P. Pattalitan",
" Jaysonn P. Villamayor",
" Ceasar M. Bangloy",
" Ma. Theresa B. Valerio",
" Cherry P. Collado",
" Rodrigo Jr. H. Castillo",
" Nelson D. Guray",
" Rhiza Grace A. Ramos",
" Romeo Jr. B. Nanglihan",
" Josefina G. Luis",
" Lahaina Sue C. Azarcon",
" Rey C. Naval",
" Nida G. Quitan",
" Ronald T. Delos Santos",
" Arlyn J. Yra",
" Jay-r R. Duldulao",
" Divine Grace D. Olaño",
" Arsenia V. Duldulao",
" Jhanrol M. Pascual",
" Jay Francis P. Yra",
" Mary Ann R. Dela Cruz",
" Eleanor G. Garingan",
" Julius G. Gumayagay",
" Janet D. Marcos",
" Divina Gracia S. Sabio",
" Elizabeth T. Carig",
" Jenalyn M. Sarmiento",
" Allan G. Galam",
" Jaimark P. Villamayor",
" Jonathan N. Tariga",
" Elizabeth D. Antonio",
" Ruby Lyn V. Gutierrez",
" Romar B. Antonio",
" Leah Grace R. Baguilat",
" Myra T. Sagun",
" Eddie L. Salvador",
" Rommel G. Peralta",
" Dyanika P. Nolasco",
" Tessie N. Butic",
" Remylien C. Songco",
" Ana Maria C. Ventura",
" Ray John M. Ramos",
" Jennyvi G. Pascua",
" Ma. Kristine Grace V. Ocado",
" Florigold V. Saldaen",
" Kristine Joy A. Castillo",
" Velor Jay B. Olaño",
" Mary Grace L. Sadang",
" Romiro G. Bautista",
" Maria Elena D. Dupa",
" Lorelie B. Marquez",
" Eden Maye D. Barayuga",
" Baldomero Jr. T. Lacaden",
" Joel G. Carig",
" Princess Lady-Lin C. Eraña",
" Mary Rose C. Liwag",
" Greguel Ailan D. Barayuga",
" Jonalyn J. Quinan",
" Julious C. Matias",
" Florante U. Galindo",
" Joselle D. Concepcion",
" Elizabeth P. Ancheta",
" Nimpha B. Amtalao",
" Crisanta L. Baquiran",
" Mary Glo M. Bonilla",
" Jefferson N. Curammeng",
" Rosalinda N. Espaldon",
" Melanie L. Fulgencio",
" Nito B. Galanta",
" Mary Joy E. Gumayagay",
" Mishell Q. Jaramillo",
" Cristobal B. Laslas",
" Liezel S. Lopez",
" Juniora Blessie Ann N. Martinez",
" Dennis S. Opiano",
" Amelia B. Pascua",
" Ailyn Joy T. Padrigo",
" Rowena Y. Pimentel",
" France Marie Ann R. Tacadena",
" Jesusie T. Ramones",
" Mary Joy A. Roldan",
" Aimee Carol R. Tangonan",
" April Corazon G. Abon",
" Israel M. Eraña",
" Maricris V. Nanglihan",
" Paul B. Pablo",
" Minajoy B. Wigan",
" German Jr. P. Umhaw",
" Mariel May S. Kidkid",
" Claudine Fay T. Domingo",
" Nobelyn V. Agapito",
" Danisse Mae P. Hernandez",
" Frelita O. Bartolome",
" Gilbren Jane G. Camayang",
" Reymund S. Grospe",
" Ysmael R. Draman",
" Arnel B. Agbayani",
" Denson M. Liday",
" Marites M. Ancheta",
" Avelino Jr. V. Pangilinan",
" Samuel B. Quezon",
" Rachel Jade C. Yere",
" Krisma Jean L. Vargas",
" Maria Teresa O. Bucio",
" Darwynn B. Estillore",
" Jaypee Angelo P. Manuel",
" Rowena S. Cabacungan",
" Marjorie C. Opiano",
" Winrich John A. Vargas",
" Richard P. Pablo",
" Jerol C. Dupaya",
" Marnie L. Bacdangan",
" Junmar A. Liwan",
" Myleene V. Bulong",
" Jay-Ar C. Del Rosario",
" Lourdes A. Curzon",
" Benjamin II S. Julian",
" Elyzar R. Rico",
" Henrey R. Ignacio",
" Maricel B. Barroga",
" William Jr. L. Sabug",
" Abigail T. Bongtayon",
" Marvin D. Olog",
" Marites O. Domingo",
" Sherwin A. Eugenio",
" Resty V. Gumuwang",
" Robert L. Damayon",
" Jumreih T. Cacal",
" Mae Ann C. Gawat",
" Girlie A. Dela Cruz",
" Elisio A. Ocado",
" Gideon Jyrus A. Matias",
" Vincent Aldrin A. Yap",
" Mary Jane T. Puon",
" Czarina Jean S. Tolenada",
" Krista Jessa Mae D. Loñez",
" Devited P. Jaramillo",
" Jay ar L. Dultiao",
" Jesa Jane F. Sales",
" Anjomar P. Tuazon",
" Merlyn P. Guade",
" Devorah Jane B. Beltran",
" Mark O. Palaje",
" John Paul C. Afalla",
" John John A. Abubo",
" Ricky G. Puon",
" Norman Jay E. Bulong",
" Romelyn S. Tugade",
" Arnel D. Esquibal",
" Marilyne C. Attaban",
" Bladimer Ali Annuar T. Lacaden",
" Rodolfo E. Luis",
" Edison Kurt M. Pacunla",
" Rommel V. Padrigo",
" Victoria N. Vicente",
" Edralyn A. Galamay",
" Belmer Jr. P. Guerrero",
" Jhon Mark S. Agsalud",
" Geraldine T. Fernando",
" Monica B. Naval",
" Christian Cel W. Julian",
" Ronald M. Buscayno",
" Robert John C. Tobias",
" Paul P. Macarilay",
" Nigel Fernand T. Corpuz",
" Primalyn G. Quimson",
" Vanessa Jean B. Patindol",
" Nelson B. Ohomna",
" Edrylle Jann T. Ramos",
" Cynthia G. Ayado",
" Gerlyn B. Orpiano",
" Mark Jefferson L. Mauyao",
" Dionie M. Necor",
" Harold N. Valentino",
" Krestalin A. Castillo",
" Mylavi H. Bernardino",
" Giancarlo B. Bautista",
" Jestonie T. De Vera",
" Gerald M. Lamaroza",
" Lenie C. Pascua",
" Helen M. Villanueva",
" Krisette Maie J. Sagales",
" Andrei Josef C. Guiamoy",
" Reynaldo Jr. M. Dulatre",
" Reymos C. Mabudyang",
" Mechil C. Domingo",
" Alvin A. Bangloy",
" Alphine P. Seriosa",
" Gazelle C. Nazarro",
" Geoff D. Monsalud",
" Marijoy C. Awisen",
" Shamma Mae A. Agustin",
" Romie Jr. E. Antonio",
" Kevin Mar T. Dela Cruz",
" Bernard Jr. G. Baui",
" Maribel J. Zonio",
" Jojie Joy P. Retoria",
" Jonathan C. Pablo",
" Jheremy T. Escalante",
" Ma. Anthonette S. Cabe",
" Jezrelle Joy T. Dela Cruz",
" Rohito P. Roga",
" Mary Ann T. Magbanua",
" Gremilyn D. Padrigo",
" Evien Reinel B. Gulan",
" Analiza  Tuppal",
" Marrieta  Mangoba",
" Irene M. Abenojar",
" Maricar R. Abello",
" Kristine Joy C. Mendoza",
" Jomari L. Martinez",
" Valen Jesnna L. Andres",
" Demetrio Jr. P. Tomas",
" Jeremy M. Abad",
" Fergie Anne A. Cafirma",
" Raymart M. Alvarez",
" Ciarayna Len E. Diampoc",
" Jomerson R. Tolentino",
" Kristine Bernadette M. Apolonio",
" Peter Paul D. Guray",
" Germilyne B. Anzaldo",
" Blessing C. Ganotice",
" Joecelle Celeste C. Manuel",
" Arnold N. Pugong",
" Jonelyn L. Agmaliw",
" Bernadette D. Asuncion",
" Elaine May R. Gonzales",
" Silverio Jr. D. Pascua",
" Justin A. Padua",
" Gideon L. Pingkihan",
" Michael R. Magdangal",
" Jennifer O. Dupaya",
" Ronalyn L. Barawid",
" Eula Jane M. Tamayo",
" Johnalyn T. Valentino",
" Monica D. Hernando",
" Brandon James D. Lagmay",
" Glomar N. Antonio Jr.",
" Devine Grace A. Bautista",
" Rachel M. Bangyod",
" Reina Beth S. Sabado",
" Cherry Ann Joy A. Lucena",
" Reynaldo B. Darang",
" Novembereigne D. Ugay",
" Amelyn G. Prado",
" Angela Mae S. Tomas",
" Prince Jerson D. Tomas",
" Martin Jan Levy V. Alcantara",
" Mark M. Rambac",
" Delfhiemae Alpha A. Lonez",
" Glydel G. Arcangel",
" Francis Klaus E. Imperio",
" Mark Lester P. Padua",
" Nolly C. Dacumos",
" Leny Jewel G. Malaque",
" Reymarc R. Acosta",
" Kaye Aneth M. Bartolome",
" Goldamae D. Estillore",
" Blessie Loraine B. Guyo",
" Carla Joyce I. Bartolome",
" Andrea M. Acob",
" Reyliza A. Ramos",
" Jaysar R. Matias",
" Cristeta S. Damasco",
" Mark Jam C. Capistrano",
" Jennifer R. Gacad",
" Joana Rose C. Garnace",
" Alicia Allyson Jonh U. Gaerlan",
" Dianne Nyra C. Garcia",
" Hannie Mae L. Pablo",
" Joey D. Marcos",
" Geremy C. Bayang",
" Iriz R. Erfe",
" Ramon Jr. D. Sanchez",
" Sunshine Mae R. Vinluan",
" Jojo C. Olonan",
" Francis C. Oleta",
" Emeterio B. Vicente",
" Alvin Rhyan D. Fernandez",
" Esther B. Florendo",
" Genesis B. Punhagban",
" Lemuel P. Rivera",
" Dondon T. Dagdag",
" Pacito P. Geron",
" Reyvilen Pearl D. Esguerra",
" Joshua L. Bucasan",
" Renalyn S. Refugia",
" Bernard R. Milla",
" Mary Jane R. Trinidad",
" Aldrin N. Damance",
" Consuelo P. Dionio",
" Danilo Jr. G. Galam",
" Jami Joyce T. Carig",
" John Eduard U. Bacani",
" Hazel Joy A. Pascua",
" David D. Estigoy",
" Kristine G. Tagalisma",
" Marjorie Anne M. Viloria",
" Leonida L. Boquing",
" Nimfa A. Valdez",
" Mayjuleth  Ramos",
" Crisologo E. Del Rosario",
" Lauro S. Aspiras",
" Emma D. Aspiras",
" Richmond Bernie T. Estela",
" Mike B. Binwag",

]




// Reusable autocomplete input
function AutocompleteInput({ id, label, name, value, onChange, options, required = false, placeholder }) {
  const listId = `${id || name}-list`;
  const normalizeOnBlur = () => {
    if (!value) return;
    const hit = options.find(opt => opt.toLowerCase() === value.trim().toLowerCase());
    if (hit && hit !== value) onChange({ target: { name, value: hit } });
  };
  return (
    <div className="col-md-6">
      <label className="form-label">{label}{required ? " *" : ""}</label>
      <input
        className="form-control"
        name={name}
        list={listId}
        value={value}
        onChange={onChange}
        onBlur={normalizeOnBlur}
        required={required}
        placeholder={placeholder}
        autoComplete="off"
      />
      <datalist id={listId}>
        {options.map(opt => <option key={opt} value={opt} />)}
      </datalist>
      {required && <div className="invalid-feedback">This field is required.</div>}
    </div>
  );
}

export default function CreateRecordForm() {
  const [controlNumber, setControlNumber] = useState("");
  
  const [formData, setFormData] = useState({
    // control_number: "",
    office_requestor: "",
    classification: "",
    priority: "",
    description: "",
    current_office: "",
    // concerned_personnel: "",
    // retention_period: "",
    // destination_office: "",
    // record_origin: "", // Will hold the document type value
    //  day: "",
  });
  const [activeOrigin, setActiveOrigin] = useState("");
  const [files, setFiles] = useState([]);
  const [uploadPct, setUploadPct] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [validated, setValidated] = useState(false);
  const [filesError, setFilesError] = useState("");
  const [showQR, setShowQR] = useState(false);
  const [createdCN, setCreatedCN] = useState("");
  const formRef = useRef(null);
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [recordCounter, setRecordCounter] = useState(1); // Sequential record counter
  const [lastDay, setLastDay] = useState(""); // Track the last day to reset the counter
 const [dayError, setDayError] = useState(""); // To display day-related errors
  const [nextControlNumber, setNextControlNumber] = useState('');
    const [record, setRecord] = useState(null);
  const [history, setHistory] = useState([]);
  
  // ---- handlers
  const handleOriginSwitch = (origin) => {
    setActiveOrigin(origin);
    setFormData((s) => ({ ...s, record_origin: origin }));  // This updates the formData with the correct origin
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(s => ({ ...s, [name]: value }));
  };

  const mapKey = (f) => `${f.name}__${f.size}__${f.lastModified}`;
  const addFiles = (incomingList) => {
    const incoming = Array.from(incomingList || []);
    if (!incoming.length) return;
    const cur = new Map(files.map(f => [mapKey(f), f]));
    for (const f of incoming) cur.set(mapKey(f), f);
    setFiles(Array.from(cur.values()));
    setFilesError("");
  };
  
//   const handleFilesChange = (e) => { 
//     addFiles(e.target.files); 
//     e.target.value = ""; 
//   };

//   const removeFile = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx));
// const updatedFormData = { ...formData, destination_office: "Office of the President" };

  const onDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); };
  const onDragEnter = onDragOver;
  const onDragLeave = (e) => { if (e.currentTarget.contains(e.relatedTarget)) return; setDragActive(false); };
  const onDrop = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); addFiles(e.dataTransfer.files); };
  const openFileDialog = () => fileInputRef.current?.click();

  const ensureInList = (value, list) => list.some(opt => opt.toLowerCase() === value.trim().toLowerCase());
  
  // Handle retention period change (from react-select)
  const handleRetentionChange = (selectedOption) => {
    setFormData((prevState) => ({
      ...prevState,
      retention_period: selectedOption ? selectedOption.value : ""
    }));
  };

  // Validate PDF files before submitting
  const validateFiles = () => {
    for (const file of files) {
      if (file.type !== "application/pdf") {
        setFilesError("Only PDF files are allowed.");
        return false;
      }
    }
    setFilesError("");  // Clear previous error if validation passes
    return true;
  };
 const generateControlNumber = () => {
    const currentYear = new Date().getFullYear().toString().slice(-2); // Last 2 digits of the year
    const currentMonth = String(new Date().getMonth() + 1).padStart(2, "0"); // 2 digits month
    const currentDay = formData.day || String(formData.day).padStart(2, "0") ; // Use user-defined day or current day
    const sequentialNumber = String(recordCounter).padStart(3, "0"); // Sequential number with leading zeros

    return `${currentYear}${currentMonth}${currentDay}-${sequentialNumber}`;
  };



useEffect(() => {
  if (!activeOrigin) return; // Don't fetch if origin is not selected
  axios.get("http://localhost:8081/next-control-number", {
    params: { origin: activeOrigin }   // Pass the origin to the backend
  }).then(resp => {
    console.log("Control Number from Backend:", resp.data.control_number);
    setControlNumber(resp.data.control_number);  // Update the control number on the frontend
  }).catch(err => {
    console.error("Error fetching next control number:", err);
  });



}, [activeOrigin]);  // Fetch when activeOrigin changes

  // Handle the day change and reset sequential number
  const handleDayChange = (e) => {
    const newDay = e.target.value;
    // Check if the day is a valid number and within the range 1-31
    if (newDay < 1 || newDay > 31) {
      setDayError("Please enter a valid day (1-31).");
    } else {
      setDayError(""); // Clear any previous error if day is valid
      setFormData({ ...formData, day: newDay });
      // If the day has changed, reset the counter
      if (newDay !== lastDay) {
        setRecordCounter(1); // Reset the counter to 1 for a new day
        setLastDay(newDay); // Store the new day as the last day
      }
    }
     const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
//   const handleSubmit = async (e) => {
//   e.preventDefault();
//   setError(null);
//   setFilesError("");  // Reset file error message

//   // Log form data to check what is being sent
//   console.log("Form Data:", formData);

//   const formEl = formRef.current;
//   if (!(formEl?.checkValidity?.() ?? true)) {
//     setValidated(true);
//     return;
//   }
//   // Ensure destination office is always "Office of the President"
//   const updatedFormData = { ...formData, destination_office: "Office of the President" };

//   setSaving(true);
//   setUploadPct(0);

//   try {
//     const fd = new FormData();
//     Object.entries(formData).forEach(([k, v]) => {
//       if (v) {
//         fd.append(k, v);
//       }
//     });

//     // Log FormData before sending the request
//     for (let pair of fd.entries()) {
//       console.log(pair[0] + ': ' + pair[1]);
//     }

//     // Make API call to create record
//     const response = await axios.post("http://localhost:8081/records", fd, {
//       headers: { "Content-Type": "multipart/form-data" },
//       onUploadProgress: (evt) => {
//         if (evt.total) setUploadPct(Math.round((evt.loaded * 100) / evt.total));
//       },
//     });

//     // Success handling
//     setCreatedCN(response.data.control_number);
//     setShowQR(true);

//     // Reset form and state
//     setFormData({ control_number: "", office_requestor: "", destination_office: "", /* reset other fields */ });
//     setFiles([]);
//     setUploadPct(0);
//     setValidated(false);
//     setFilesError(""); // Reset any file error messages

//   } catch (err) {
//     console.error("API Request Error: ", err);  // Log the full error for debugging
//     setError("Failed to create record. Please try again later.");
//   } finally {
//     setSaving(false);
//   }
// };



// const handleSubmit = async (e) => {
//   e.preventDefault();
//   setError(null);
//   setFilesError("");  // Reset file error message

//   // Log form data to check what is being sent
//   console.log("Form Data:", formData);

//   const formEl = formRef.current;
//   if (!(formEl?.checkValidity?.() ?? true)) {
//     setValidated(true);
//     return;
//   }

//   // Set destination_office to "Office of the President" before submitting
//   const updatedFormData = { ...formData, destination_office: "Office of the President" };

//   setSaving(true);
//   setUploadPct(0);

//   try {
//     const fd = new FormData();
//      Object.entries(formData).forEach(([k, v]) => {
//         if (v) {
//           fd.append(k, v);
//         }
//       });

//     // Append all form data fields
//     Object.entries(updatedFormData).forEach(([k, v]) => {
//       if (v) {
//         fd.append(k, v);
//       }
//     });

//     // Log FormData before sending the request
//     for (let pair of fd.entries()) {
//       console.log(pair[0] + ': ' + pair[1]);
//     }

//     // Make API call to create record
//     const response = await axios.post("http://localhost:8081/records", fd, {
//       headers: { "Content-Type": "multipart/form-data" },
//       onUploadProgress: (evt) => {
//         if (evt.total) setUploadPct(Math.round((evt.loaded * 100) / evt.total));
//       },
//     });
// setRecordCounter((prevCounter) => prevCounter + 1); // Increment counter for next record

//     // Success handling
//     setCreatedCN(response.data.control_number);
//     setShowQR(true);

//     // Reset form and state
//     setFormData({ control_number: "", office_requestor: "", destination_office: "", /* reset other fields */ });
//     setFiles([]);
//     setUploadPct(0);
//     setValidated(false);
//     setFilesError(""); // Reset any file error messages

//   } catch (err) {
//     console.error("API Request Error: ", err);  // Log the full error for debugging
//     setError("Failed to create record. Please try again later.");
//   } finally {
//     setSaving(false);
//   }
// };


// const handleSubmit = async (e) => {
//   e.preventDefault();
//   const payload = { ...formData, control_number: controlNumber };
//   setError(null);
//   setFilesError("");  // Reset file error message

//   // Log form data to check what is being sent
//   console.log("Form Data:", formData);

//   const formEl = formRef.current;
//   if (!(formEl?.checkValidity?.() ?? true)) {
//     setValidated(true);
//     return;
//   }

//   // Set destination_office to "Office of the President" before submitting
//   const updatedFormData = { ...formData, destination_office: "Office of the President" };
//  delete updatedFormData.day;
//   setSaving(true);
//   setUploadPct(0);

//   try {
//     const fd = new FormData();
    
//     // Append updatedFormData fields (no need to append formData again)
//     Object.entries(updatedFormData).forEach(([k, v]) => {
//       if (v) {
//         fd.append(k, v);
//       }
//     });

//     // Log FormData before sending the request
//     for (let pair of fd.entries()) {
//       console.log(pair[0] + ': ' + pair[1]);
//     }

//     // Make API call to create record
//     const response = await axios.post("http://localhost:8081/records", fd, {
//       headers: { "Content-Type": "multipart/form-data" },
//       onUploadProgress: (evt) => {
//         if (evt.total) setUploadPct(Math.round((evt.loaded * 100) / evt.total));
//       },
//     });

//     // Increment counter for next record
//     setRecordCounter((prevCounter) => prevCounter + 1);

//     // Success handling
//     setCreatedCN(response.data.control_number);
//     setShowQR(true);

//     // Reset form and state
//     setFormData({ control_number: "", office_requestor: "", destination_office: "", /* reset other fields */ });
//     setFiles([]);
//     setUploadPct(0);
//     setValidated(false);
//     setFilesError(""); // Reset any file error messages



//      // Sending the form data along with the generated control number to the backend
//       await axios.post("http://localhost:8081/records", payload);
//       alert("Record created successfully!");
//       // Reset form or do other post-submit actions
//   } catch (err) {
//     console.error("API Request Error: ", err);  // Log the full error for debugging
//     setError("Failed to create record. Please try again later.");
//   } finally {
//     setSaving(false);
//   }
// };


const handleSubmit = async (e) => {
  e.preventDefault();




  
  // Ensure control number is generated and included in the form data
  const payload = { ...formData, control_number: controlNumber, current_office: "Office of the President" };
 console.log("Form Data Sent to Backend:", payload);
  // Reset any previous errors
  setError(null);
  setFilesError("");  // Reset file error message

  // Log the form data to check what is being sent
  console.log("Form Data:", payload);

  const formEl = formRef.current;
  if (!(formEl?.checkValidity?.() ?? true)) {
    setValidated(true);
    return;
  }

  // Set destination_office to "Office of the President" before submitting
  const updatedFormData = { ...payload, destination_office: "Office of the President" };

  // Remove the day field from the form data if it's not needed
  delete updatedFormData.day;

  setSaving(true);
  setUploadPct(0);

  try {
    const fd = new FormData();
    
    // Append updatedFormData fields to FormData object
    Object.entries(updatedFormData).forEach(([k, v]) => {
      if (v) {
        fd.append(k, v);
      }
    });

    // Log FormData before sending the request
    for (let pair of fd.entries()) {
      console.log(pair[0] + ': ' + pair[1]);
    }

    // Make API call to create the record
    const response = await axios.post("http://localhost:8081/records", fd, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (evt) => {
        if (evt.total) setUploadPct(Math.round((evt.loaded * 100) / evt.total));
      },
    });

    // Success handling
    setCreatedCN(response.data.control_number);  // Assuming control_number is returned in the response
    setShowQR(true);
  // Reset form data and state
    resetForm();  // This is where the form gets reset after a successful submission

 
    // Show success message
    alert("Record created successfully!");

  } catch (err) {
    console.error("API Request Error: ", err);  // Log the full error for debugging
    setError("Failed to create record. Please try again later.");
  } finally {
    setSaving(false);
  }
};
const resetForm = () => {
  setFormData({
    control_number: "", // Reset the control number as well
    office_requestor: "",
    description: "",
    classification: "",
    priority: "",
    record_origin: "",
    concerned_personnel: "",
    destination_office: "",
    retention_period: "1",
    remarks: "",
    current_office: "Office of the President", // Or other default value
  });
  setFiles([]);  // Clear files
  setUploadPct(0);  // Reset upload percentage
  setValidated(false);  // Reset form validation
  setFilesError(""); // Clear any file-related error messages
};
  const dropStyle = {
    border: `2px dashed ${filesError ? "#dc3545" : "#999"}`,
    borderRadius: 12,
    padding: 16,
    textAlign: "center",
    cursor: "pointer",
    background: dragActive ? "rgba(0,123,255,0.08)" : "#fafafa",
    transition: "background 120ms ease",
  };
const closeModal = () => {
    setShowQR(false); // Hide the modal when closing it
  };
  const closePopup = () => {
    setShowQR(false);
  };





  return (
    <div className="d-flex">
      <Sidebar />
      <div className="flex-grow-1">
        <Navbar />
        <div className="container p-3">
          <h2>Create New Record</h2>
          {error && <div className="alert alert-danger">{error}</div>}

          <div className="mb-3 d-flex gap-2">
            {ORIGIN_OPTIONS.map(opt => (
              <button key={opt} type="button" onClick={() => handleOriginSwitch(opt)}
                className={`btn ${activeOrigin === opt ? "btn-primary" : "btn-outline-primary"}`}>{opt}</button>
            ))}
          </div>

          <form ref={formRef} className={`row g-3 ${validated ? "was-validated" : ""}`} onSubmit={handleSubmit} encType="multipart/form-data" noValidate>
            {/* Control No */}
            <div className="col-md-6">
              <label className="form-label">Control No. *</label>
              <input
                className="form-control"
                name="control_number"
                pattern="[A-Za-z0-9._\-\/]+" 
                value={controlNumber || ""}
                onChange={handleChange}
                placeholder="e.g., 2025-09-001"
                required
                autoComplete="off"
                readOnly
              />
              <div className="invalid-feedback">Control number is required.</div>
              <div className="form-text">Letters, numbers, -, _, /, . allowed</div>
            </div>
              {/* Day (User Defined) */}
      <div className="col-md-4">
        <label className="form-label">Day</label>
        <input
          type="number"
          className="form-control"
          name="day"
          value={formData.day}
          onChange={handleDayChange}
          placeholder="Enter Day"
        />
      </div>
            {/* Office/Requestor */}
            {/* <div className="col-md-6">
              <label className="form-label">Office/ Requestor *</label>
              <input
                className="form-control"
                name="office_requestor"
                value={formData.office_requestor}
                onChange={handleChange}
                required
              />
              <div className="invalid-feedback">Office/Requestor is required.</div>
            </div> */}

    <AutocompleteInput 
            label="Office/Requestor" 
            name="office_requestor" 
            value={formData.office_requestor} 
            onChange={handleChange} 
            options={DESTINATION_OFFICES} 
            placeholder="Select Office/Requestor" 
            required/>

            {/* Description */}
            <div className="col-12">
              <label className="form-label">Title and Description *</label>
              <textarea className="form-control" name="description" rows={2} value={formData.description} onChange={handleChange} required></textarea>
              <div className="invalid-feedback">Description is required.</div>
            </div>
            {/* Source */} {/* Concerned Personnel */}
            {/* <div className="col-md-6">
              <label className="form-label">Concerned Personnel *</label>
              <input
                className="form-control"
                name="concerned_personnel"
                value={formData.concerned_personnel}
                onChange={handleChange}
                required
              />
              <div className="invalid-feedback">This field is required.</div>
            </div> */}
             
            <AutocompleteInput 
            label="Classification" 
            name="classification" 
            value={formData.classification} 
            onChange={handleChange} 
            options={CLASSIFICATION_OPTIONS} 
            placeholder="e.g., Academic" />
            <AutocompleteInput 
            label="Priority" 
            name="priority" 
            value={formData.priority} 
            onChange={handleChange} 
            options={PRIORITY_OPTIONS} 
            placeholder="e.g., Normal" />

{/* Retention Period */}
            {/* <div className="col-md-6">
              <label className="form-label">Retention Period </label>
              <Select
                options={RETENTION_OPTIONS}
                onChange={handleRetentionChange}
                value={RETENTION_OPTIONS.find(option => option.value === formData.retention_period)}
                placeholder="Select Retention Period"
                isSearchable
                // required
              />
            </div> */}
{/* <AutocompleteInput 
            label="Concerned Personnel" 
            name="concerned_personnel" 
            value={formData.concerned_personnel} 
            onChange={handleChange} 
            options={CONCERNED_PERSONNEL} 
            placeholder="Select Concerned Personnel" /> */}

{/* 
            <AutocompleteInput 
            label="Destination Office" 
            name="destination_office" 
            value={formData.destination_office} 
            onChange={handleChange} 
            options={DESTINATION_OFFICES} 
            placeholder="Select Destination" /> */}
  {/* Remarks */}
            {/* <div className="col-12">
              <label className="form-label">Remarks </label>
              <textarea 
              className="form-control" 
              name="remarks" 
              rows={2} 
              value={formData.remarks} 
              onChange={handleChange} 
              // required
              ></textarea>
              <div className="invalid-feedback">Remarks are required.</div>
            </div> */}
            {/* Attachments */}
            {/* <div className="col-12">
              <input ref={fileInputRef} type="file" multiple className="d-none" onChange={handleFilesChange} accept="application/pdf" />
              <div style={dropStyle} onClick={openFileDialog} onDragOver={onDragOver} onDragEnter={onDragEnter} onDragLeave={onDragLeave} onDrop={onDrop}>
                <div className="mb-1 fw-semibold">Drag & drop files here or click to browse</div>
                <div className="text-muted small">At least one PDF file required</div>
              </div>
              {filesError && <div className="invalid-feedback d-block">{filesError}</div>}
              {files.length > 0 && (
                <ul className="list-unstyled mt-2">
                  {files.map((f, idx) => (
                    <li key={mapKey(f)} className="d-flex justify-content-between align-items-center">
                      <span>{f.name} ({Math.round(f.size / 1024)} KB)</span>
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeFile(idx)}>Remove</button>
                    </li>
                  ))}
                </ul>
              )}
            </div> */}
{/* {showQR && createdCN && (
  <div>
    <QRCodeCanvas value={createdCN} size={256} />
    <a href={`/uploads/${createdCN}.png`} download>
      <button>Download QR Code</button>
    </a>
  </div>
)} */}
            {/* Upload progress */}
            {saving && uploadPct > 0 && (
              <div className="col-12">
                <div className="progress">
                  <div className="progress-bar" style={{ width: `${uploadPct}%` }}>{uploadPct}%</div>
                </div>   
              </div>
            )}

            {/* Submit */}
            <div className="col-12 d-flex gap-2">
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Create Record"}</button>
              <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => window.history.back()}>Cancel</button>
            </div>
          </form>
           {/* Modal to show QR Code */}
      {showQR && createdCN && (
        <div className="qr-popup show">
          <span className="close-btn" onClick={closePopup}>&times;</span>
          <h5>Generated QR Code</h5>
          <br></br>
          <QRCodeCanvas value={createdCN} size={256} />
          <a href={`/uploads/${createdCN}.png`} download>
          <br/>
          <br/>
            <button>Download QR Code</button>
          </a>
        </div>
      )}

      
        </div>
      </div>
    </div>
  );
}