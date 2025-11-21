import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import axios from "./axios";
import { socket } from "../socket";
import "./PriorityBadges.css";
import "./Dashboard.css"; // Assuming you have some CSS for styling
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { QRCodeCanvas } from "qrcode.react";

function AutocompleteInput({
  id,
  label,
  name,
  value,
  onChange,
  options,
  required = false,
  placeholder,
}) {
  const listId = `${id || name}-list`;
  const normalizeOnBlur = () => {
    if (!value) return;
    const hit = options.find(
      (opt) => opt.toLowerCase() === value.trim().toLowerCase()
    );
    if (hit && hit !== value) onChange({ target: { name, value: hit } });
  };
  return (
    <div className="col-md-6">
      <label className="form-label">
        {label}
        {required ? " *" : ""}
      </label>
      <input
        className="form-control"
        name={name}
        list={listId}
        value={value || ""}
        onChange={onChange}
        onBlur={normalizeOnBlur}
        required={required}
        placeholder={placeholder}
        autoComplete="off"
      />
      <datalist id={listId}>
        {options.map((opt) => (
          <option key={opt} value={opt} />
        ))}
      </datalist>
      {required && (
        <div className="invalid-feedback">This field is required.</div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [rowsRaw, setRowsRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [qrData, setQrData] = useState({});
  const [q, setQ] = useState("");
  const [office, setOffice] = useState("All");
  const [classification, setClassification] = useState("All");
  const [priority, setPriority] = useState("All");
  const [docType, setDocType] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [officeRequestor, setOfficeRequestor] = useState("All");

  const [showModal, setShowModal] = useState(false); // State for showing the modal
  const [selectedRecord, setSelectedRecord] = useState(null); // Record selected for editing
  const [formData, setFormData] = useState({
    control_number: "",
    office_requestor: "",
    description: "",
    classification: "",
    priority: "",
    record_origin: "",
    concerned_personnel: "",
    destination_office: "",
    retention_period: "",
    remarks: "",
  });
  const CLASSIFICATION_OPTIONS = [
    "Academic",
    "Administrative",
    "Financial",
    "HR",
    "Others",
  ];
  const PRIORITY_OPTIONS = ["Normal", "Urgent", "Immediate"];
  const RETENTION_OPTIONS = [
    { label: "1 Year", value: "1" },
    { label: "2 Years", value: "2" },
    { label: "3 Years", value: "3" },
    { label: "4 Years", value: "4" },
    { label: "5 Years", value: "5" },
    { label: "6 Years", value: "6" },
    { label: "7 Years", value: "7" },
    { label: "8 Years", value: "8" },
    { label: "9 Years", value: "9" },
    { label: "10 Years", value: "10" },
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
  ];

  const [filterType, setFilterType] = useState("All"); // Track filter state
  const [activeOrigin, setActiveOrigin] = useState("");
  const [files, setFiles] = useState([]);
  const [uploadPct, setUploadPct] = useState(0);
  const [saving, setSaving] = useState(false);
  const [validated, setValidated] = useState(false);
  const [filesError, setFilesError] = useState("");
  const [createdCN, setCreatedCN] = useState("");
  const formRef = useRef(null);
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const mapKey = (f) => `${f.name}__${f.size}__${f.lastModified}`;
  const addFiles = (incomingList) => {
    const incoming = Array.from(incomingList || []);
    if (!incoming.length) return;
    const cur = new Map(files.map((f) => [mapKey(f), f]));
    for (const f of incoming) cur.set(mapKey(f), f);
    setFiles(Array.from(cur.values()));
    setFilesError("");
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
  const handleFilesChange = (e) => {
    addFiles(e.target.files);
    e.target.value = "";
  };

  const removeFile = (idx) =>
    setFiles((prev) => prev.filter((_, i) => i !== idx));

  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };
  const onDragEnter = onDragOver;
  const onDragLeave = (e) => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setDragActive(false);
  };
  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    addFiles(e.dataTransfer.files);
  };
  const openFileDialog = () => fileInputRef.current?.click();

  const ensureInList = (value, list) =>
    list.some((opt) => opt.toLowerCase() === value.trim().toLowerCase());

  const navigate = useNavigate();
  const fetchRecordWithHistory = async (recordId) => {
    try {
      const res = await axios.get(`http://localhost:8081/records/${recordId}`);
      setRecord(res.data); // Store record with history in state
    } catch (error) {
      console.error("Error fetching record with history:", error);
    }
  };

  // Function to load records
  const load = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/records/my-office");
      setRowsRaw(Array.isArray(res.data) ? res.data : []);
      console.log("Fetched Records:", res.data); // Log fetched records
      setError(null);
    } catch (e) {
      console.error("Load records error:", e?.response?.data || e.message);
      if (e?.response?.status === 401 || e?.response?.status === 403) {
        setError("Session expired or unauthorized. Please log in again.");
      } else {
        setError("Failed to load records");
      }
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const onUpdated = () => load();
    socket.on("recordUpdated", onUpdated);
    load(); // Fetch records initially

    return () => socket.off("recordUpdated", onUpdated);
  }, []);

  // Format date function
  const fmtDate = (d) => (d ? new Date(d).toLocaleString() : "—");

  // Clear filter function
  const clearFilters = () => {
    setQ("");
    setOffice("All");
    setClassification("All");
    setPriority("All");
    setOfficeRequestor("All");
    setDocType("All");
    setFromDate("");
    setToDate("");
  };

  // Handle edit
  const handleEdit = (record) => {
    setSelectedRecord(record); // Store the selected record
    setFormData({
      control_number: record.control_number,
      office_requestor: record.office_requestor,
      description: record.description,
      classification: record.classification,
      priority: record.priority,
      record_origin: record.record_origin,
      concerned_personnel: record.concerned_personnel,
      destination_office: record.destination_office,
      retention_period: record.retention_period,
      current_office: record.current_office || "Unknown Office",
    });
    setShowModal(true); // Show the modal
  };

  // Handle update form field change
  const handleChange = (e) => {
    const { name, value } = e.target;

    console.log(`Updating ${name}:`, value); // Add this to track changes
    setFormData((prevState) => ({ ...prevState, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Creating FormData instance
    const formDataToSend = new FormData();

    // Append the fields that are being updated
    formDataToSend.append("concerned_personnel", formData.concerned_personnel);
    formDataToSend.append("destination_office", formData.destination_office);
    formDataToSend.append("retention_period", formData.retention_period);
    formDataToSend.append("remarks", formData.remarks || "No remarks");
    formDataToSend.append(
      "current_office",
      formData.current_office || "Unknown Office"
    );
    // Append the files to FormData if there are any
    files.forEach((file) => {
      formDataToSend.append("files", file);
    });

    // Log the FormData object to check if data is appended correctly
    console.log("FormData to Send:", formDataToSend);

    try {
      // Sending the PUT request to the backend
      const response = await axios.put(
        `/records/${selectedRecord.id}`,
        formDataToSend,
        {
          headers: {
            "Content-Type": "multipart/form-data", // Ensure content type is multipart/form-data
          },
        }
      );

      alert("Record updated successfully!");
      setShowModal(false);
      load(); // Reload the records to reflect the updated data
    } catch (e) {
      console.error(
        "Error response from backend:",
        e.response?.data || e.message
      );
      alert(
        "Failed to update record: " + (e.response?.data?.message || e.message)
      );
    }
  };

  // Handle delete
  const handleDelete = async (r) => {
    if (!r.id) return alert("Cannot delete this record.");
    if (!window.confirm(`Delete "${r.control_number}"? This cannot be undone.`))
      return;
    try {
      setDeletingId(r.id);
      await axios.delete(`/records/${r.id}`);
      setRowsRaw((prev) => prev.filter((x) => x.id !== r.id));
    } catch (e) {
      console.error(e);
      alert("Failed to delete record.");
    } finally {
      setDeletingId(null);
    }
  };

  // Transform rows into records with files grouped
  // const records = useMemo(() => {
  //   const map = new Map();
  //   for (const r of rowsRaw) {
  //     const recId =
  //       r.id ?? r.control_number ?? Math.random().toString(36).slice(2);
  //     if (!map.has(recId)) {
  //       map.set(recId, {
  //         id: recId,
  //         control_number: r.control_number || "",
  //         // title: r.title || "",
  //         classification: r.classification || "",
  //         priority: r.priority || "Normal",
  //         office_requestor: r.office_requestor || "",
  //         destination_office: r.destination_office || "",
  //         record_origin: r.record_origin || "Unknown",
  //         created_at: r.created_at || null,
  //         updated_at: r.updated_at || r.created_at, // Include updated_at
  //         description: r.description || "",
  //         retention_period: r.retention_period || "",
  //         remarks: r.remarks || "",
  //         // concerned_personnel: r.concerned_personnel || "",
  //         files: [],
  //         qrcode_path: r.qrcode_path || "",
  //         current_office: r.current_office || "Unknown Office",
  //       });
  //     }
  //     if (r.file_path) {
  //       map.get(recId).files.push({
  //         name: r.file_name || r.file_path.split("/").pop(),
  //         path: r.file_path,
  //       });
  //     }
  //   }
  //   return Array.from(map.values()).sort(
  //     (a, b) =>
  //       (new Date(b.created_at).getTime() || 0) -
  //       (new Date(a.created_at).getTime() || 0)
  //   );
  // }, [rowsRaw]);
  const records = useMemo(() => {
    const map = new Map();
    for (const r of rowsRaw) {
      const recId =
        r.id ?? r.control_number ?? Math.random().toString(36).slice(2);
      if (!map.has(recId)) {
        map.set(recId, {
          id: recId,
          control_number: r.control_number || "",
          classification: r.classification || "",
          priority: r.priority || "Normal",
          office_requestor: r.office_requestor || "",
          destination_office: r.destination_office || "",
          record_origin: r.record_origin || "Unknown",
          created_at: r.created_at || null,
          updated_at: r.updated_at || r.created_at, // Keep track of both
          description: r.description || "",
          retention_period: r.retention_period || "",
          remarks: r.remarks || "",
          status: r.qrcode_path ? "Updated" : "Not Updated", // Check if QR code exists
          files: [],
          qrcode_path: r.qrcode_path || "",
          current_office: r.current_office || "Unknown Office",
        });
      }
      if (r.file_path) {
        map.get(recId).files.push({
          name: r.file_name || r.file_path.split("/").pop(),
          path: r.file_path,
        });
      }
    }
    return Array.from(map.values()).sort(
      (a, b) =>
        (new Date(b.created_at).getTime() || 0) -
        (new Date(a.created_at).getTime() || 0)
    );
  }, [rowsRaw]);
  const handleUpdateSuccess = (updatedRecord) => {
    // Remove the updated record from the dashboard
    setRowsRaw((prev) =>
      prev.filter((record) => record.id !== updatedRecord.id)
    );

    // Optionally, show a success message
    alert("Record updated successfully!");
  };
  const [record, setRecord] = useState(null);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const fromT = fromDate ? new Date(fromDate).setHours(0, 0, 0, 0) : null;
    const toT = toDate ? new Date(toDate).setHours(23, 59, 59, 999) : null;

    return records.filter((r) => {
      // Filter by search term
      if (
        ql &&
        ![
          r.control_number,
          r.title,
          r.classification,
          r.destination_office,
          r.record_origin,
        ]
          .join(" ")
          .toLowerCase()
          .includes(ql)
      )
        return false;

      // Filter by office
      if (office !== "All" && r.destination_office !== office) return false;
      if (office !== "All" && r.office_requestor !== office) return false;

      // Filter by classification
      if (classification !== "All" && r.classification !== classification)
        return false;
      if (priority !== "All" && r.priority !== priority) return false;
      if (docType !== "All" && r.record_origin !== docType) return false;

      // Filter by date range
      const ct = r.created_at ? new Date(r.created_at).getTime() : null;
      if ((fromT && ct < fromT) || (toT && ct > toT)) return false;

      // Filter by internal or external records
      if (
        filterType !== "All" &&
        r.record_origin.toLowerCase() !== filterType.toLowerCase()
      )
        return false;

      return true;
    });
  }, [
    records,
    q,
    office,
    classification,
    priority,
    docType,
    fromDate,
    toDate,
    filterType,
  ]);

  const officeCount = useMemo(() => {
    const counts = {};

    filtered.forEach((record) => {
      const office = record.destination_office || "Unknown Office"; // Use "Unknown Office" as fallback
      counts[office] = (counts[office] || 0) + 1;
    });

    return counts;
  }, [filtered]);
  const handleViewQR = (r) => {
    console.log("QR Data:", r);
    if (!r.qrcode_path) return alert("QR code not available for this record.");

    // Set the QR data based on the qrcode_path that was saved
    setQrData({
      control_number: r.control_number,
      title: r.title,
      // Use the saved qrcode_path to display the QR image
      url: r.qrcode_path.replace(
        "C:\\code\\rmudts\\server\\uploads\\",
        "/uploads/"
      ),
    });

    setCreatedCN(r.control_number); // Ensure this sets the correct control number
    setShowQR(true);
  };

  const chartData = useMemo(() => {
    return Object.keys(officeCount).map((office) => ({
      office: office,
      records: officeCount[office],
    }));
  }, [officeCount]);
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
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
            <div className="text-muted small">
              Showing <strong>{filtered.length}</strong> of {records.length}
            </div>
          </div>
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              <label htmlFor="recordFilter" className="form-label mr-2">
                Filter by Record Type
              </label>
              <select
                id="recordFilter"
                className="form-select"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="All">All</option>
                <option value="internal">Internal</option>
                <option value="external">External</option>
              </select>
            </div>

            <div className="d-flex align-items-center">
              <label htmlFor="officeFilter" className="form-label mr-2">
                Filter by Office
              </label>
              <select
                id="officeFilter"
                className="form-select"
                value={office}
                onChange={(e) => setOffice(e.target.value)}
              >
                <option value="All">All Offices</option>
                {DESTINATION_OFFICES.map((office, index) => (
                  <option key={index} value={office}>
                    {office}
                  </option>
                ))}
              </select>
            </div>

            <div className="d-flex align-items-center">
              <label htmlFor="dateFilter" className="form-label mr-2">
                Filter by Date
              </label>
              <input
                type="date"
                id="dateFilter"
                className="form-control"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
          </div>

          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
            <div className="text-muted small">
              Showing <strong>{filtered.length}</strong> of {rowsRaw.length}
            </div>
          </div>

          {/* Records Overview Chart */}
          <div className="office-records-container mt-4">
            <h5 className="mb-4">Office Records Overview</h5>

            {/* Bar Chart for Records Per Office */}
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="office" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="records" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="record-cards">
            {filtered.length > 0 ? (
              filtered.map((record) => (
                <div key={record.id} className="card record-card">
                  <div className="card-header">
                    <h3>{record.control_number || "No Control Number"}</h3>
                    <p>{record.record_origin || "Untitled"}</p>
                    {/* Display status */}
                    <span
                      className={`badge ${
                        record.status === "Updated"
                          ? "badge-success"
                          : "badge-warning"
                      }`}
                    >
                      {record.status} {/* Display "Updated" or "Not Updated" */}
                    </span>
                  </div>
                  <div className="card-body">
                    <p>
                      <strong>Classification:</strong> {record.classification}
                    </p>
                    <p>
                      <strong>Priority:</strong> {record.priority}
                    </p>
                    <p>
                      <strong>Current Office:</strong>{" "}
                      {record.current_office || "Unknown Office"}
                    </p>
                  </div>
                  <div className="card-footer">
                    <button
                      className="btn btn-outline-primary"
                      onClick={() => handleViewQR(record)}
                    >
                      QR
                    </button>
                    <button
                      className="btn btn-outline-danger"
                      onClick={() => handleEdit(record)}
                    >
                      Update
                    </button>
                    <button
                      className="btn btn-outline-danger"
                      onClick={() => handleDelete(record)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="status">No records available.</div>
            )}
          </div>

          {showQR && (
            <div className="qr-modal-backdrop" onClick={closeModal}>
              <div
                className="qr-modal-dialog"
                onClick={(e) => e.stopPropagation()}
              >
                <h5>QR Code for {qrData.control_number}</h5>
                {/* Ensure the correct URL is used to display the image */}
                <img
                  src={`http://localhost:8081${qrData.url}`}
                  alt={`QR Code for ${qrData.control_number}`}
                />

                <button
                  className="btn btn-sm btn-outline-secondary mt-2"
                  onClick={closeModal} // Close the modal
                >
                  Close
                </button>
              </div>
            </div>
          )}
          {/* Edit Modal */}

          {showModal && selectedRecord && (
            <div className="modal-overlay" onClick={() => setShowModal(false)}>
              {/* Modal Dialog: Prevent backdrop click when interacting with the form */}
              <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()} // Prevents closing modal when clicking inside
              >
                <h2>Edit Record</h2>
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label>Control Number</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.control_number}
                      disabled
                    />
                  </div>

                  <div className="form-group">
                    <label>Office/Requestor</label>
                    <input
                      type="text"
                      className="form-control"
                      name="office_requestor"
                      value={formData.office_requestor}
                      onChange={handleChange}
                      // required
                      disabled
                    />
                  </div>

                  <div className="form-group">
                    <label>Classification</label>
                    <select
                      className="form-control"
                      name="classification"
                      value={formData.classification}
                      onChange={handleChange}
                      // required
                      disabled
                    >
                      {CLASSIFICATION_OPTIONS.map((option, index) => (
                        <option key={index} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Priority</label>
                    <select
                      className="form-control"
                      name="priority"
                      value={formData.priority}
                      onChange={handleChange}
                      // required
                      disabled
                    >
                      {PRIORITY_OPTIONS.map((option, index) => (
                        <option key={index} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <AutocompleteInput
                      label="Concerned Personnel"
                      name="concerned_personnel"
                      value={formData.concerned_personnel}
                      onChange={handleChange}
                      options={CONCERNED_PERSONNEL}
                      placeholder="Select Concerned Personnel"
                    />
                  </div>
                  <div className="form-group">
                    <label>Destination Office</label>
                    <select
                      className="form-control"
                      name="destination_office"
                      value={formData.destination_office}
                      onChange={handleChange}
                      required
                    >
                      {DESTINATION_OFFICES.map((option, index) => (
                        <option key={index} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Retention Period</label>
                    <select
                      className="form-control"
                      name="retention_period"
                      value={formData.retention_period || "1"} // Ensure this is always a valid value
                      onChange={handleChange}
                      required
                    >
                      {RETENTION_OPTIONS.map((option, index) => (
                        <option key={index} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      className="form-control"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      // required
                      disabled
                    />
                  </div>

                  <div className="form-group">
                    <label>Remarks</label>
                    <textarea
                      className="form-control"
                      name="remarks"
                      value={formData.remarks}
                      onChange={handleChange} // Handles updating form data
                      rows={4} // Set number of rows for the textarea
                      placeholder="Add remarks here..."
                    />
                  </div>
                  {/* Attachments */}
                  <div className="col-12">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="d-none"
                      onChange={handleFilesChange}
                      accept="application/pdf"
                    />
                    <div
                      style={dropStyle}
                      onClick={openFileDialog}
                      onDragOver={onDragOver}
                      onDragEnter={onDragEnter}
                      onDragLeave={onDragLeave}
                      onDrop={onDrop}
                    >
                      <div className="mb-1 fw-semibold">
                        Drag & drop files here or click to browse
                      </div>
                      <div className="text-muted small">
                        At least one PDF file required
                      </div>
                    </div>
                    {filesError && (
                      <div className="invalid-feedback d-block">
                        {filesError}
                      </div>
                    )}
                    {files.length > 0 && (
                      <ul className="list-unstyled mt-2">
                        {files.map((f, idx) => (
                          <li
                            key={mapKey(f)}
                            className="d-flex justify-content-between align-items-center"
                          >
                            <span>
                              {f.name} ({Math.round(f.size / 1024)} KB)
                            </span>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => removeFile(idx)}
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <br />
                  <button
                    type="submit"
                    className="btn btn-primary"
                    onClick={(e) => e.stopPropagation()} // Prevent closing modal on form submit
                  >
                    Update Record
                  </button>

                  <button
                    className="btn btn-secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowModal(false); // Close modal when close button is clicked
                    }}
                  >
                    Close
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
