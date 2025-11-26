import Calendar from './Calendar';
import ProfileCard from './ProfileCard';
import Contacts from './Contacts';
import Section from '../routes/Section'
import { useState } from 'react';

export default function FrontPage() {
  const [isContactsOpen, setContactsOpen] = useState(false); // popup state

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
