import React from 'react';
import { Alert, AlertType } from '../types';
import { AlertTriangleIcon, CheckCircleIcon, XCircleIcon } from './icons';

interface AlertsCardProps {
  alerts: Alert[];
}

const alertIcons: Record<AlertType, React.ReactNode> = {
  [AlertType.CRITICAL]: <XCircleIcon className="w-6 h-6 text-red-400" />,
  [AlertType.WARNING]: <AlertTriangleIcon className="w-6 h-6 text-orange-400" />,
  [AlertType.OK]: <CheckCircleIcon className="w-6 h-6 text-green-400" />,
};

const alertBgColors: Record<AlertType, string> = {
    [AlertType.CRITICAL]: 'bg-red-500/10 border-red-500/30',
    [AlertType.WARNING]: 'bg-orange-500/10 border-orange-500/30',
    [AlertType.OK]: 'bg-green-500/10 border-green-500/30',
};


const AlertsCard: React.FC<AlertsCardProps> = ({ alerts }) => {
  const displayAlerts = alerts.length > 0 ? alerts : [{ type: AlertType.OK, message: 'Ideal Conditions. The hive is happy!' }];

  return (
    <div className="h-full flex flex-col">
      <h3 className="text-lg font-bold text-gray-900 mb-3">Alerts</h3>
      <div className="space-y-3 flex-grow">
        {displayAlerts.map((alert, index) => (
          <div key={index} className={`flex items-start space-x-3 p-3 rounded-md border ${alertBgColors[alert.type]}`}>
            <div className="flex-shrink-0 mt-0.5">{alertIcons[alert.type]}</div>
            <p className="text-sm text-gray-800">{alert.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AlertsCard;
