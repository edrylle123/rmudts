import React from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";


function AllRecords() {


  return (
    <div>
      {" "}
      <div className="app-layout">
        <Sidebar active="page-key" />
        <div className="main-content">
          <Navbar />
        </div>
      </div>
    </div>
  );
}

export default AllRecords;
