import profileImage from '../assets/pekka.png'
import { getUsername } from './calendarUtils';

export default function ProfileCard({
    name = getUsername(),
    ssn = "120812*****",
    OID = "000000",
    birthday = "12.8.2012",
    group = "7A",
    sport = "Pesäpallo - Varala",
    guardian = "Hulda Huoltaja",
    guardianPhone = "+358401111111",
    phonenumber = "+358402222222",
    password = "**********" }) {
  return (
    <div className="profile-background">
      <img 
        className="profile-image" 
        src={profileImage} 
        alt={`${name} profile image`} 
      />
      <div className="profile-info">
        <div className="profile-name">{name}</div>
        <p>
          <span className="label">Henkilötunnus</span>
          <span className='value'>{ssn}</span>
        </p>
        <p>
          <span className="label">OID</span>
          <span className='value'>{OID}</span>
        </p>
        <p>
          <span className="label">Syntymäpäivä</span>
          <span className='value'>{birthday}</span>
        </p>
        <p>
          <span className="label">Ryhmä</span>
          <span className='value'>{group}</span>
        </p>
        <p>
          <span className="label">Laji/seura</span>
          <span className='value'>{sport}</span>
        </p>
        <p>
          <span className="label">Huoltaja</span>
          <span className='value'>{guardian}</span>
        </p>
        <p>
          <span className="label">Huoltajan puhelinnumero</span>
          <span className='value'>{guardianPhone}</span>
        </p>
        <p>
          <span className="label">Puhelinnumero</span>
          <span className='value'>{phonenumber}</span>
        </p>
        <p>
          <span className="label">Salasana</span>
          <span className='value'>{password}</span>
        </p>
      </div>
    </div>
  );
}
