import React, { useEffect, useState } from "react";
import axios from "./axios"; // Assuming you have an axios instance set up
import { useParams } from "react-router-dom"; // Import useParams hook

export default function RecordDetail() {
  const { id } = useParams(); // Use the useParams hook to access the 'id' from the URL
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRecord = async () => {
      try {
        const res = await axios.get(`/records/${id}`);
        setRecord(res.data); // Assuming the response data contains the record details
      } catch (err) {
        setError("Failed to load record");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchRecord();
    }
  }, [id]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div>
      <h1>Record Detail</h1>
      <p>Control Number: {record?.control_number}</p>
      <p>Title: {record?.title}</p>
      <p>Description: {record?.description}</p>
      {/* Add more details as needed */}
    </div>
  );
}
