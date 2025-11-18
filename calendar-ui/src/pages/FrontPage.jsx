import Calendar from './Calendar';
import ProfileCard from './ProfileCard';
import Section from '../routes/Section'

export default function FrontPage() {
  return (
    <div className="frontpage">
      <Section />
      <ProfileCard />
      <Calendar />
    </div>
  );
}
