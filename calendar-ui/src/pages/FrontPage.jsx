import Calendar from './Calendar';
import ProfileCard from './ProfileCard';
import Contacts from './Contacts';
import Section from '../routes/Section'
import { useState } from 'react';

export default function FrontPage() {
  const [isContactsOpen, setContactsOpen] = useState(false); // popup state


  //palauttaa frontpage komponentin, joka sisältää Section, ProfileCard, Contacts ja Calendar komponentit
  // Contacts komponentin näkyvyys määräytyy isContactsOpen tilan perusteella, ja sen sulkeminen tapahtuu asettamalla isContactsOpen tilaksi false
  // käyttäjä tekee toimenpiteen Section komponentissa, joka kutsuu onOpenContacts funktiota, joka asettaa isContactsOpen tilaksi true, jolloin Contacts komponentti tulee näkyviin. Frontendissa hallitaan popupin näkyvyyttä tilan avulla.
  return (
    <div className="frontpage">
      <Section onOpenContacts={() => setContactsOpen(true)}/>
      <ProfileCard />
      <Contacts
        isOpen={isContactsOpen}
        onClose={() => setContactsOpen(false)}
      />
      <Calendar />
    </div>
  );
}
