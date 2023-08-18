import React, { useState, useEffect } from 'react'
import Col from 'react-bootstrap/Col';
import Nav from 'react-bootstrap/Nav';
import Row from 'react-bootstrap/Row';
import Tab from 'react-bootstrap/Tab';
import Form from 'react-bootstrap/Form';
import Container from 'react-bootstrap/Container';
import TimezoneSelect from 'react-timezone-select'


function LeftTabsExample() {
    const [selectedTimezone, setSelectedTimezone] =useState(
        Intl.DateTimeFormat().resolvedOptions().timeZone
      )
      const tabs={
        fontSize:"15px",
        textAlign:"left"
      }
      const content={
        fontSize:"12px",
        textAlign:"left !important"
      }
  return (
   
    <Tab.Container id="left-tabs-example" defaultActiveKey="first">
      <Row>
        <Col sm={2}>
          <Nav variant="pills" className="flex-column">
            <Nav.Item>
              <Nav.Link eventKey="first" style={tabs}>Dynamic Group1</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="second" style={tabs}>Dynamic Group2</Nav.Link>
            </Nav.Item>
          </Nav>
        </Col>
        <Col sm={10}>
          <Tab.Content>
            <Tab.Pane eventKey="first">
            <Form>
             
    <Container>
        <Row>
            <Col xs md lg={6}>

            <Row className="justify-content-md-left">
            <Col xs lg="7">
                <h5 style={tabs}>Dynamic Attribute</h5>
            </Col>
            <Col xs lg="5"></Col>
            </Row>
            <Row>
                <Col> <div key="1" className="mb-3">
                    <Form.Check
                        inline
                        label="Contact Data"
                        name="group1"
                        type="checkbox"
                        id="1"
                        style={content}
                    />
                    <Form.Check
                        inline
                        label="Journey Data"
                        name="group1"
                        type="checkbox"
                        id="2"
                        style={content}
                    />
                    
                    </div>
                    <Form.Select style={content} aria-label="Dynamic Attribute">
                    <option>Dynamic Attribute</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    </Form.Select>
                </Col>
            </Row>
            </Col>
            <Col xs md lg={6}>

            <Row className="justify-content-md-left justify-content-lg-left">
            <Col xs lg="7">
                <h5 style={tabs}>Dynamic Attribute</h5>
            </Col>
            <Col xs lg="5"></Col>
            </Row>
            <Row>
                <Col> <div key="1" className="mb-3">
                    <Form.Check
                        inline
                        label="Contact Data"
                        name="group1"
                        type="checkbox"
                        id="1"
                        style={content}
                    />
                    <Form.Check
                        inline
                        label="Journey Data"
                        name="group1"
                        type="checkbox"
                        id="2"
                        style={content}
                    />
                    
                    </div>
                </Col>
                <Form.Select style={content} aria-label="Date Attribute">
                    <option>Date Attribute</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    </Form.Select>
            </Row>
            </Col>
        </Row>
        <Row className='mt-4'>
            <Col xs md lg={2}>
            <Form.Label style={content} >Duration</Form.Label> 
            <Form.Select style={content}  aria-label="1">
                    <option>1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    </Form.Select>

            </Col>
            <Col xs md lg={5}>
            <Form.Label>&nbsp;</Form.Label> 
            <Form.Select style={content}  aria-label="Days">
                    <option>Days</option>
                    <option value="2">Weeks</option>
                    <option value="3">Months</option>
             </Form.Select>

            </Col>
            <Col xs md lg={5}>
            <Form.Label>&nbsp;</Form.Label> 
            <Form.Select style={content}  aria-label="After">
                    <option>After</option>
                    <option value="2">Before</option>
             </Form.Select>

            </Col>
        </Row>
        <Row>
            <Col>
            <Form.Label style={content} >Timezone</Form.Label> 
            <TimezoneSelect style={content} 
                value={selectedTimezone}
                onChange={setSelectedTimezone}
        />
            </Col>
        </Row>


        <Row>
                <Col> <div key="1">
                    <Form.Check
                        inline
                        label="Extend wait duration until specific time"
                        name="group1"
                        type="checkbox"
                        id="1"
                        style={content}
                    /></div>
                    </Col>
                    </Row>

    </Container>

         
               
                

    </Form>
                
                </Tab.Pane>
            <Tab.Pane eventKey="second">Second tab content</Tab.Pane>
          </Tab.Content>
        </Col>
      </Row>
    </Tab.Container>
  );
}

export default LeftTabsExample;