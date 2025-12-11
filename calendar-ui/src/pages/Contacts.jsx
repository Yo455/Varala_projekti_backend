import { useState } from "react";

//komponentti, joka näyttää kontaktien listan ja mahdollistaa viestin lähettämisen valituille kontakteille
function Contacts ({ isOpen, onClose }) {
    const [selectedIds, setSelectedIds] = useState([]);
    const contacts = [
        {id: "1", name: "Olli Opettaja"},
        {id: "2", name: "Kirsi Opo"},
        {id: "3",name: "Vallu Valmentaja"},
        {id: "4",name: "Hulda Huoltaja"}
    ]

    if (!isOpen) return null;

    //käsittelee yksittäisen checkboxin tilan muutoksen
    const handleCheckboxChange = (event) => {
        const checkedId = event.target.value;
        if (event.target.checked) {
            setSelectedIds([...selectedIds, checkedId])
        } else {
            setSelectedIds(selectedIds.filter(id => id !== checkedId))
        }
    }
    //käsittelee kaikkien checkboxien valinnan tai poistamisen
    const handleSelectAllCheckboxes = (event) => {
        // taulkko kaikista kontaktien ID:stä
        const contactsArray = contacts.map(c => c.id);
        // jos valitaan kaikki, aseta kaikki ID:t valituiksi, muuten tyhjennä valinnat
        setSelectedIds(event.target.checked ? contactsArray : [])
    }

    //käsittelee viestin lähettämisen
    const handleSendMessage = () => {
        alert("Viesti lähetetty onnistuneesti!")
        setSelectedIds([]);
        onClose(); // close popup
    }

    //Katsoo onko kaikki kontaktit valittu
    const allSelected = selectedIds.length === contacts.length;

    //palauttaa kontaktien popup-ikkunan sisällön
    return (
        <div>
            <Popup showPopup={isOpen} closePopup={onClose}>
                <div className="popup-container">
                    <h2>Kontaktit</h2>

                    {contacts.map((contact) => (
                        <div className="popup-contacts" key={contact.id}>
                            <label className="contact-label">
                                {contact.name}
                                <input
                                    type="checkbox"
                                    value={contact.id}
                                    checked={selectedIds.includes(contact.id)}
                                    onChange={(event) => { handleCheckboxChange(event) }}
                                />
                            </label>
                        </div>
                    ))}
                    <div className="select-all-checkbox">
                        <span className="select-all-text">Valitse kaikki</span>
                        <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={(event) => { handleSelectAllCheckboxes(event) }}
                        />
                    </div>
                    <form className="message-form">
                        <label>Kirjoita viesti:</label>
                        <textarea />
                    </form>
                    <div className="send-button-container">
                        <button className="send-button" onClick={handleSendMessage}>Lähetä viesti</button>
                    </div>
                </div>
            </Popup>
        </div>
    )
}


// Popup-komponentti, joka näyttää sisällön popup-ikkunassa
function Popup({ showPopup, closePopup, children }) {
    if (!showPopup) return null

    return (
        <div className="popup">
            <button className="close-button" onClick={closePopup}>x</button>
            {children}
        </div>
    )
}
//exporttaa Contacts-komponentin
export default Contacts;