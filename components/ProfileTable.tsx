import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface ProfileTableProps {
  data: {
    first_name?: string;
    last_name?: string;
    experiences?: string[];
    skills?: string[];
    education?: string[];
  };
}

export default function ProfileTable({ data }: ProfileTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profil extrait</CardTitle>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <tbody>
            {data.first_name && (
              <tr>
                <td className="font-medium pr-4">Prénom</td>
                <td>{data.first_name}</td>
              </tr>
            )}
            {data.last_name && (
              <tr>
                <td className="font-medium pr-4">Nom</td>
                <td>{data.last_name}</td>
              </tr>
            )}
            {data.experiences && data.experiences.length > 0 && (
              <tr>
                <td className="font-medium pr-4 align-top">Expériences</td>
                <td>
                  <ul className="list-disc pl-4 space-y-1">
                    {data.experiences.map((exp, i) => (
                      <li key={i}>{exp}</li>
                    ))}
                  </ul>
                </td>
              </tr>
            )}
            {data.skills && data.skills.length > 0 && (
              <tr>
                <td className="font-medium pr-4 align-top">Compétences</td>
                <td>
                  <ul className="list-disc pl-4 space-y-1">
                    {data.skills.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </td>
              </tr>
            )}
            {data.education && data.education.length > 0 && (
              <tr>
                <td className="font-medium pr-4 align-top">Formation</td>
                <td>
                  <ul className="list-disc pl-4 space-y-1">
                    {data.education.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
