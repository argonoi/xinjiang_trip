import { useEffect, useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const STORAGE_KEY = "shared-trip-wallet-groups-v3";
const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

function App() {
  const [groups, setGroups] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const [activeGroupId, setActiveGroupId] = useState(null);

  const [groupName, setGroupName] = useState("");
  const [groupSize, setGroupSize] = useState(9);
  const [nameInputs, setNameInputs] = useState(Array(9).fill(""));

  const [selectedPersonId, setSelectedPersonId] = useState(null);

  const [depositAmount, setDepositAmount] = useState("");
  const [depositPersonIds, setDepositPersonIds] = useState([]);

  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("吃饭");
  const [expenseParticipantIds, setExpenseParticipantIds] = useState([]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
  }, [groups]);

  const activeGroup =
    groups.find((group) => group.id === activeGroupId) || null;

  const people = activeGroup?.people || [];
  const deposits = activeGroup?.deposits || [];
  const expenses = activeGroup?.expenses || [];

  function updateActiveGroup(updater) {
    setGroups((prev) =>
      prev.map((group) =>
        group.id === activeGroupId ? updater(group) : group
      )
    );
  }

  function handleGroupSizeChange(value) {
    const size = Math.max(1, Number(value) || 1);
    setGroupSize(size);

    setNameInputs((prev) => {
      if (size > prev.length) {
        return [...prev, ...Array(size - prev.length).fill("")];
      }
      return prev.slice(0, size);
    });
  }

  function handleNameChange(index, value) {
    setNameInputs((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  }

  function resetCreateForm() {
    setGroupName("");
    setGroupSize(9);
    setNameInputs(Array(9).fill(""));
  }

  function handleCreateGroup() {
    const createdPeople = nameInputs.slice(0, groupSize).map((name, index) => ({
      id: index + 1,
      name: name.trim() || `Person ${index + 1}`,
    }));

    const newGroup = {
      id: Date.now(),
      name: groupName.trim() || `Group ${groups.length + 1}`,
      people: createdPeople,
      deposits: [],
      expenses: [],
      createdAt: new Date().toLocaleString(),
    };

    setGroups((prev) => [newGroup, ...prev]);
    setActiveGroupId(newGroup.id);
    setSelectedPersonId(createdPeople[0]?.id ?? null);

    setDepositAmount("");
    setDepositPersonIds([]);
    setExpenseAmount("");
    setExpenseCategory("吃饭");
    setExpenseParticipantIds([]);

    resetCreateForm();
  }

  function handleOpenGroup(groupId) {
    const group = groups.find((g) => g.id === groupId);
    setActiveGroupId(groupId);
    setSelectedPersonId(group?.people[0]?.id ?? null);
    setDepositAmount("");
    setDepositPersonIds([]);
    setExpenseAmount("");
    setExpenseCategory("吃饭");
    setExpenseParticipantIds([]);
  }

  function handleDeleteGroup(groupId) {
    const confirmed = window.confirm("Delete this group?");
    if (!confirmed) return;

    setGroups((prev) => prev.filter((group) => group.id !== groupId));

    if (activeGroupId === groupId) {
      setActiveGroupId(null);
      setSelectedPersonId(null);
    }
  }

  function handleBackToGroups() {
    setActiveGroupId(null);
    setSelectedPersonId(null);
    setDepositAmount("");
    setDepositPersonIds([]);
    setExpenseAmount("");
    setExpenseCategory("吃饭");
    setExpenseParticipantIds([]);
  }

  function toggleDepositPerson(personId) {
    setDepositPersonIds((prev) =>
      prev.includes(personId)
        ? prev.filter((id) => id !== personId)
        : [...prev, personId]
    );
  }

  function handleAddDeposit() {
    const amount = Number(depositAmount);
    if (!activeGroup || amount <= 0 || depositPersonIds.length === 0) return;

    const timestamp = new Date().toLocaleString();

    const newDeposits = depositPersonIds.map((personId, index) => ({
      id: Date.now() + index,
      personId,
      amount,
      time: timestamp,
    }));

    updateActiveGroup((group) => ({
      ...group,
      deposits: [...group.deposits, ...newDeposits],
    }));

    setDepositAmount("");
    setDepositPersonIds([]);
  }

  function toggleExpenseParticipant(personId) {
    setExpenseParticipantIds((prev) =>
      prev.includes(personId)
        ? prev.filter((id) => id !== personId)
        : [...prev, personId]
    );
  }

  function handleAddExpense() {
    const amount = Number(expenseAmount);
    if (!activeGroup || amount <= 0 || expenseParticipantIds.length === 0) return;

    const newExpense = {
      id: Date.now(),
      amount,
      category: expenseCategory,
      participantIds: expenseParticipantIds,
      time: new Date().toLocaleString(),
    };

    updateActiveGroup((group) => ({
      ...group,
      expenses: [...group.expenses, newExpense],
    }));

    setExpenseAmount("");
    setExpenseCategory("吃饭");
    setExpenseParticipantIds([]);
  }

  function handleDeleteDeposit(depositId) {
    updateActiveGroup((group) => ({
      ...group,
      deposits: group.deposits.filter((deposit) => deposit.id !== depositId),
    }));
  }

  function handleDeleteExpense(expenseId) {
    updateActiveGroup((group) => ({
      ...group,
      expenses: group.expenses.filter((expense) => expense.id !== expenseId),
    }));
  }

  const personSummaries = useMemo(() => {
    return people.map((person) => {
      const totalDeposits = deposits
        .filter((deposit) => deposit.personId === person.id)
        .reduce((sum, deposit) => sum + deposit.amount, 0);

      const allocatedExpenses = expenses.reduce((sum, expense) => {
        if (!expense.participantIds.includes(person.id)) return sum;
        return sum + expense.amount / expense.participantIds.length;
      }, 0);

      return {
        ...person,
        totalDeposits,
        allocatedExpenses,
        balance: totalDeposits - allocatedExpenses,
      };
    });
  }, [people, deposits, expenses]);

  const selectedPersonSummary =
    personSummaries.find((person) => person.id === selectedPersonId) || null;

  const selectedPersonDeposits = deposits.filter(
    (deposit) => deposit.personId === selectedPersonId
  );

  const selectedPersonExpenses = expenses
    .filter((expense) => expense.participantIds.includes(selectedPersonId))
    .map((expense) => ({
      ...expense,
      share: expense.amount / expense.participantIds.length,
    }));

  const totalDeposited = deposits.reduce((sum, deposit) => sum + deposit.amount, 0);
  const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  const expenseByCategory = useMemo(() => {
    const result = {};

    expenses.forEach((expense) => {
      if (!result[expense.category]) {
        result[expense.category] = 0;
      }
      result[expense.category] += expense.amount;
    });

    return Object.entries(result).map(([category, value]) => ({
      name: category,
      value,
    }));
  }, [expenses]);

  if (!activeGroup) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={pageTitleStyle}>Shared Trip Wallet</h1>
            <p style={pageSubtitleStyle}>
              Create a group, save it, reopen it later, or delete it.
            </p>
          </div>

          <div style={twoColumnStyle}>
            <section style={cardStyle}>
              <h2 style={sectionTitleStyle}>Create Group</h2>

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Group name</label>
                <input
                  type="text"
                  placeholder="e.g. Xinjiang Trip"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={labelStyle}>Number of people</label>
                <input
                  type="number"
                  min="1"
                  value={groupSize}
                  onChange={(e) => handleGroupSizeChange(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <h3 style={{ marginBottom: 10 }}>Names</h3>
              {nameInputs.slice(0, groupSize).map((name, index) => (
                <div key={index} style={{ marginBottom: 10 }}>
                  <input
                    type="text"
                    placeholder={`Person ${index + 1}`}
                    value={name}
                    onChange={(e) => handleNameChange(index, e.target.value)}
                    style={inputStyle}
                  />
                </div>
              ))}

              <button onClick={handleCreateGroup} style={primaryButtonStyle}>
                Create Group
              </button>
            </section>

            <section style={cardStyle}>
              <h2 style={sectionTitleStyle}>Saved Groups</h2>

              {groups.length === 0 ? (
                <p style={mutedTextStyle}>No saved groups yet.</p>
              ) : (
                groups.map((group) => (
                  <div key={group.id} style={savedGroupCardStyle}>
                    <div style={{ fontWeight: "bold", marginBottom: 4 }}>
                      {group.name}
                    </div>
                    <div style={savedGroupMetaStyle}>
                      {group.people.length} people · created {group.createdAt}
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => handleOpenGroup(group.id)}
                        style={secondaryButtonStyle}
                      >
                        Open
                      </button>
                      <button
                        onClick={() => handleDeleteGroup(group.id)}
                        style={dangerButtonStyle}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </section>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div style={topBarStyle}>
          <div>
            <h1 style={pageTitleStyle}>{activeGroup.name}</h1>
            <p style={pageSubtitleStyle}>Auto-saved locally in your browser</p>
          </div>

          <button onClick={handleBackToGroups} style={secondaryButtonStyle}>
            Back to Groups
          </button>
        </div>

        <section style={cardStyle}>
          <h2 style={sectionTitleStyle}>Summary</h2>

          <div style={summaryGridStyle}>
            <SummaryBox title="Total Deposited" value={`¥${totalDeposited.toFixed(2)}`} />
            <SummaryBox title="Total Spent" value={`¥${totalSpent.toFixed(2)}`} />
            <SummaryBox title="People" value={`${people.length}`} />
          </div>
        </section>

        <div style={twoColumnStyle}>
          <section style={cardStyle}>
            <h2 style={sectionTitleStyle}>Expense Breakdown</h2>

            {expenseByCategory.length === 0 ? (
              <p style={mutedTextStyle}>No expenses yet.</p>
            ) : (
              <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={expenseByCategory}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={110}
                      label
                    >
                      {expenseByCategory.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section style={cardStyle}>
            <h2 style={sectionTitleStyle}>Selected Person Details</h2>

            {selectedPersonSummary ? (
              <div>
                <h3 style={{ marginBottom: 8 }}>{selectedPersonSummary.name}</h3>
                <p
                  style={{
                    color: selectedPersonSummary.balance >= 0 ? "#15803d" : "#dc2626",
                    fontWeight: "bold",
                  }}
                >
                  Current Balance: ¥{selectedPersonSummary.balance.toFixed(2)}
                </p>

                <h4>Deposits</h4>
                {selectedPersonDeposits.length === 0 ? (
                  <p style={mutedTextStyle}>No deposits yet.</p>
                ) : (
                  selectedPersonDeposits.map((deposit) => (
                    <div key={deposit.id} style={detailRowStyle}>
                      <span>
                        + ¥{deposit.amount.toFixed(2)} ({deposit.time})
                      </span>
                      <button
                        onClick={() => handleDeleteDeposit(deposit.id)}
                        style={smallDangerButtonStyle}
                      >
                        Delete
                      </button>
                    </div>
                  ))
                )}

                <h4 style={{ marginTop: 18 }}>Allocated Expenses</h4>
                {selectedPersonExpenses.length === 0 ? (
                  <p style={mutedTextStyle}>No expenses yet.</p>
                ) : (
                  selectedPersonExpenses.map((expense) => (
                    <div key={expense.id} style={detailRowStyle}>
                      <span>
                        - ¥{expense.share.toFixed(2)} | {expense.category} | total ¥
                        {expense.amount.toFixed(2)} | {expense.time}
                      </span>
                      <button
                        onClick={() => handleDeleteExpense(expense.id)}
                        style={smallDangerButtonStyle}
                      >
                        Delete
                      </button>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <p style={mutedTextStyle}>Select a person to view details.</p>
            )}
          </section>
        </div>

        <section style={cardStyle}>
          <h2 style={sectionTitleStyle}>People Balances</h2>

          <div style={peopleGridStyle}>
            {personSummaries.map((person) => (
              <div
                key={person.id}
                onClick={() => setSelectedPersonId(person.id)}
                style={{
                  ...personCardStyle,
                  backgroundColor:
                    selectedPersonId === person.id ? "#f8fafc" : "#ffffff",
                  boxShadow:
                    selectedPersonId === person.id
                      ? "0 8px 20px rgba(37, 99, 235, 0.08)"
                      : "0 3px 10px rgba(15, 23, 42, 0.04)",
                }}
              >
                <div style={{ fontSize: 18, fontWeight: "bold", marginBottom: 12 }}>
                  {person.name}
                </div>

                <div style={personStatGridStyle}>
                  <div>
                    <div style={smallLabelStyle}>Deposited</div>
                    <div>¥{person.totalDeposits.toFixed(2)}</div>
                  </div>

                  <div>
                    <div style={smallLabelStyle}>Expenses</div>
                    <div>¥{person.allocatedExpenses.toFixed(2)}</div>
                  </div>

                  <div>
                    <div style={smallLabelStyle}>Balance</div>
                    <div
                      style={{
                        color: person.balance >= 0 ? "#15803d" : "#dc2626",
                        fontWeight: "bold",
                      }}
                    >
                      ¥{person.balance.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div style={twoColumnStyle}>
          <section style={cardStyle}>
            <h2 style={sectionTitleStyle}>Add Deposit</h2>
            <p style={mutedTextStyle}>Amount per selected person</p>

            <div style={{ marginBottom: 12 }}>
              <input
                type="number"
                placeholder="Amount per selected person"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <strong>Select people:</strong>
              <div style={checkboxGridStyle}>
                {people.map((person) => (
                  <label key={person.id} style={checkboxItemStyle}>
                    <input
                      type="checkbox"
                      checked={depositPersonIds.includes(person.id)}
                      onChange={() => toggleDepositPerson(person.id)}
                    />{" "}
                    {person.name}
                  </label>
                ))}
              </div>
            </div>

            <button onClick={handleAddDeposit} style={primaryButtonStyle}>
              Add Deposit
            </button>
          </section>

          <section style={cardStyle}>
            <h2 style={sectionTitleStyle}>Add Expense</h2>
            <p style={mutedTextStyle}>Total amount will be split evenly</p>

            <div style={{ marginBottom: 12 }}>
              <input
                type="number"
                placeholder="Total expense amount"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                style={{ ...inputStyle, marginBottom: 10 }}
              />

              <select
                value={expenseCategory}
                onChange={(e) => setExpenseCategory(e.target.value)}
                style={inputStyle}
              >
                <option value="机票">机票</option>
                <option value="酒店">酒店</option>
                <option value="吃饭">吃饭</option>
                <option value="娱乐">娱乐</option>
                <option value="其他">其他</option>
              </select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <strong>Select participants:</strong>
              <div style={checkboxGridStyle}>
                {people.map((person) => (
                  <label key={person.id} style={checkboxItemStyle}>
                    <input
                      type="checkbox"
                      checked={expenseParticipantIds.includes(person.id)}
                      onChange={() => toggleExpenseParticipant(person.id)}
                    />{" "}
                    {person.name}
                  </label>
                ))}
              </div>
            </div>

            <button onClick={handleAddExpense} style={primaryButtonStyle}>
              Add Expense
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}

function SummaryBox({ title, value }) {
  return (
    <div style={summaryBoxStyle}>
      <div style={summaryBoxTitleStyle}>{title}</div>
      <div style={summaryBoxValueStyle}>{value}</div>
    </div>
  );
}

const pageStyle = {
  background: "#f3f4f6",
  minHeight: "100vh",
};

const containerStyle = {
  maxWidth: "1180px",
  margin: "0 auto",
  padding: "24px",
  fontFamily: "Arial, sans-serif",
  color: "#111827",
};

const pageTitleStyle = {
  margin: 0,
  marginBottom: 8,
  fontSize: "32px",
};

const pageSubtitleStyle = {
  margin: 0,
  color: "#6b7280",
};

const sectionTitleStyle = {
  marginTop: 0,
  marginBottom: 16,
};

const twoColumnStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
  gap: "20px",
  marginBottom: "20px",
};

const topBarStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  marginBottom: "20px",
  flexWrap: "wrap",
};

const cardStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  padding: "22px",
  background: "#ffffff",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
  marginBottom: "20px",
};

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "12px",
  border: "1px solid #d1d5db",
  boxSizing: "border-box",
  fontSize: "14px",
  background: "#ffffff",
};

const primaryButtonStyle = {
  padding: "12px 18px",
  borderRadius: "12px",
  border: "none",
  background: "#2563eb",
  color: "white",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "14px",
};

const secondaryButtonStyle = {
  padding: "12px 18px",
  borderRadius: "12px",
  border: "1px solid #d1d5db",
  background: "white",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "14px",
};

const dangerButtonStyle = {
  padding: "12px 18px",
  borderRadius: "12px",
  border: "none",
  background: "#dc2626",
  color: "white",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "14px",
};

const smallDangerButtonStyle = {
  padding: "6px 10px",
  borderRadius: "8px",
  border: "none",
  background: "#dc2626",
  color: "white",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "12px",
  flexShrink: 0,
};

const summaryGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "12px",
};

const summaryBoxStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  padding: "16px",
  background: "#f9fafb",
};

const summaryBoxTitleStyle = {
  color: "#6b7280",
  fontSize: "14px",
  marginBottom: "6px",
};

const summaryBoxValueStyle = {
  fontWeight: "bold",
  fontSize: "22px",
};

const peopleGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "14px",
};

const personCardStyle = {
  border: "1px solid #e5e7eb",
  padding: "16px",
  borderRadius: "14px",
  cursor: "pointer",
};

const personStatGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(70px, 1fr))",
  gap: "10px",
};

const smallLabelStyle = {
  color: "#6b7280",
  fontSize: "13px",
  marginBottom: "4px",
};

const checkboxGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: "8px",
  marginTop: "10px",
};

const checkboxItemStyle = {
  display: "block",
  padding: "8px 10px",
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
  background: "#fafafa",
};

const mutedTextStyle = {
  color: "#6b7280",
};

const savedGroupCardStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "14px",
  marginBottom: "12px",
  background: "#fafafa",
};

const savedGroupMetaStyle = {
  color: "#6b7280",
  fontSize: "14px",
  marginBottom: "10px",
};

const labelStyle = {
  display: "block",
  marginBottom: "6px",
  fontWeight: "bold",
};

const detailRowStyle = {
  marginBottom: 8,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  borderBottom: "1px solid #f0f0f0",
  paddingBottom: "8px",
};

export default App;