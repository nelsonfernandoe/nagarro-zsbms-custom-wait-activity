import React, { useState, useEffect } from 'react'
import LeftTabsExample from './LeftTabsExample'
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import { FaRegSun } from "react-icons/fa";

function DynamicActivity() {
  const [isActive, setIsActive] = useState({
    id: '',
  })
  useEffect(() => {
    console.log(isActive)
  }, [isActive])
  const hideShowDiv = (e) => {
    setIsActive({
      id: e.target.id,
    })
  }
  const hideDiv = (e) => {
    setIsActive({
      id: '',
    })
  }
  const mystyle = {
    alignItem: "right",
    cursot: "pointer !important",
    textDecoration:"none",
    
    marginTop:"100px"
  };
  return (
    <div className="row">
      <h2 className="mb-5 text-center">
       
      </h2>
      <div className="col-6">
     
        <div className={isActive.id === 'divOne' ? `divOne` : 'divOne d-none'}>
         
        <h3 className='mb-5'>Dynamic Wait Activity</h3>
         <LeftTabsExample />
         <Row>
         <Col xs md lg={2}></Col>
            <Col xs md lg={5}>
            <button style={mystyle}
            id="divOne"
            onClick={(e) => {
                hideDiv(e)
              }}
            className="btn btn-danger btn-sm"
          >
            Close
          </button>
            </Col>
            <Col xs md lg={5}>
            <button style={mystyle}
            id="divOne"
            onClick={(e) => {
                hideDiv(e)
              }}
            className="btn btn-primary btn-sm"
          >
            Done
          </button>
            </Col>
         </Row>
            
        </div>
      </div>

      <div className="col-6">
        <div className=" mb-4">
          <button
            id="divOne"
            onClick={(e) => {
              hideShowDiv(e)
            }}
            className="btn btn-danger btn-sm"
          >
            <FaRegSun />
          </button>
        </div>
      </div>
  

    </div>
  )
}
export default DynamicActivity
